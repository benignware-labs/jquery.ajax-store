(function($) {
  
  function getXMLStylesheet(doc) {
    var i, child, children = doc.childNodes, match;
    for (i = 0; child = children[i]; i++) {
      var child = children[i];
      if (child.target === 'xml-stylesheet') {
        match = child.data.match(/href=\"(.*)\"/);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }
  
  function transformToDocument(xml, xsl, options) {
    options = options || {};
    var result = null, xsltProcessor;
    // Transform
    if (xml.implementation && xml.implementation.createDocument) {
      // W3C
      xsltProcessor = new XSLTProcessor();
      try {
        xsltProcessor.importStylesheet(xsl);
      } catch (e) {
        console.error(e);
      }
      result = xsltProcessor.transformToDocument(xml);
    } else {
      // Internet Explorer
      var impl = new ActiveXObject("Microsoft.XMLDOM");
      if (impl) {
        var xslt = new ActiveXObject("MSXML2.FreeThreadedDOMDocument");
        var processor   = new ActiveXObject("Msxml2.XSLTemplate");
        processor.stylesheet = xsl;
        var objXSLTProc = processor.createProcessor();
        objXSLTProc.input = xml;
        objXSLTProc.transform();
        result = objXSLTProc.output;
      }
    }
    
    // Apply post processing
    if (result) {
      if (options.disableOutputEscaping) {
        $(result).find('*').contents().filter(function () { return this.nodeType === 3; }).each(function() {
          var frag = document.createDocumentFragment();
          var holder = document.createElement("div");
          holder.innerHTML = this.nodeValue;
          $(holder).contents().each(function() {
            frag.appendChild(this);
          });
          $(frag).insertBefore(this);
          $(this).remove();
        });
      }
    }
    return result;
  }
  
  $.ajaxTransport("xslt", function(options, originalOptions, jqXHR, headers, completeCallback   ) {
    if (options.dataType === 'xslt' || options.xmlStylesheet) {
      options.dataType = 'xslt';
      var xhr, aborted = false;
      return {
        send: function( headers, completeCallback ) {
          // Load Document
          xhr = $.ajax($.extend(true, {}, options, {
            dataType: 'xml',
            success: function(xml) {
              if (xml && !aborted) {
                var xmlStylesheet = options.xmlStylesheet || getXMLStylesheet(xml);
                if (xmlStylesheet) {
                  // Load Stylesheet
                  xhr = $.ajax({
                    url: xmlStylesheet,
                    dataType: 'xml',
                    success: function(xmlStylesheet) {
                      if (!aborted) {
                        // Transform
                        var result = transformToDocument(xml, xmlStylesheet, options);
                        if (result) {
                          // Success
                          completeCallback(200, "Transform successful", {xslt: result});
                        } else {
                          // Fail
                          completeCallback(400, "Error transforming xml", {});
                        }
                      }
                    },
                    error: function() {
                      if (!aborted) {
                        completeCallback(xhr.status, xhr.statusText, {});
                      }
                    }
                  });
                } else {
                  // No Stylesheet provided
                  completeCallback(400, "No Stylesheet provided", {});
                }
              }
            },
            error: function(doc) {
              if (!aborted) {
                completeCallback(xhr.status, xhr.statusCode, {});
              }
            }
          }));
        },
        abort: function() {
          aborted = true;
          if (xhr) {
            xhr.abort();
          }
        }
      };
    }
  });
  
})(jQuery);
