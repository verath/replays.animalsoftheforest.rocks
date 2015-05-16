module.exports = function (grunt) {

    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        "babel": {
            dist: {
                files: [{
                    expand: true,
                    cwd: "src",
                    src: ["**/*.js"],
                    dest: "dist/",
                    ext: ".js"
                }]
            }
        },
        copy: {
            views: {
                files: [{expand: true, cwd: "src", src: ['views/**'], dest: 'dist/'}]
            }
        },
        clean: {
            dist: ['dist/**']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask("default", ["copy:views", "babel"]);

};