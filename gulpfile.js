var gulp = require("gulp");
var babel = require("gulp-babel");
var del = require('del');

gulp.task('clean:dist', function (cb) {
    del([
        'dist/**/*'
    ], cb);
});

gulp.task("scripts", ["clean:dist"], function () {
    var sources = ["src/**/*.es6", "src/**/*.js"];

    return gulp.src(sources)
        .pipe(babel())
        .pipe(gulp.dest("dist"));
});

gulp.task("views", ["clean:dist"], function () {
    gulp.src("src/views/**/*.handlebars")
        .pipe(gulp.dest("dist/views/"));
});

gulp.task("default", ["scripts", "views"]);