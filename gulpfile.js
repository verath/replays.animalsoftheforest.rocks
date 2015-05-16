var gulp = require("gulp");
var babel = require("gulp-babel");

gulp.task("scripts", function () {
    var sources = ["src/**/*.es6", "src/**/*.js"];

    return gulp.src(sources)
        .pipe(babel())
        .pipe(gulp.dest("dist"));
});

gulp.task("views", function () {
    gulp.src("src/views/**/*.handlebars")
        .pipe(gulp.dest("dist/views/"));
});

gulp.task("build", ["scripts", "views"]);
gulp.task("default", ["build"]);