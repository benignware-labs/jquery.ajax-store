module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    watch: {
      dist: {
        files: ["src/**/*.js"],
        tasks: ['build']
      }
    },
    copy: {
      dist: {
        expand: true,
        cwd: 'src',
        src: ['jquery.ajax-store.js'],
        dest: 'dist/'
      },
      samples: {
        expand: true,
        cwd: 'src',
        src: ['jquery.ajax-store.js'],
        dest: 'samples/dist/'
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/jquery.ajax-store.min.js': ['src/jquery.ajax-store.js']
        }
      }
    },
    connect: {
      samples: {
        options: {
          open: true,
          base: 'samples',
          port: 9000,
          livereload: true,
          keepalive: false,
          index: 'index.html'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', ['jshint']);
  
  grunt.registerTask('build', ['copy:samples', 'copy:dist', 'uglify:dist']);
  
  grunt.registerTask('serve', ['build', 'connect:samples', 'watch']);

};