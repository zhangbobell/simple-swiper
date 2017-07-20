'use strict';

var gulp = require('gulp');
var plugin = require('gulp-load-plugins')();
var concat = require('gulp-concat');
// var gulpCopy = require('gulp-copy');
// var htmlreplace = require('gulp-html-replace');
var runSequence = require('run-sequence');

gulp.task('clean', function () {
    return gulp.src([
        './dist/*'
    ], {
        read: false
    })
    .pipe(plugin.clean());
});

gulp.task('css', function () {
    return gulp.src([
    		'./src/swiper.css'
    	])
        .pipe(plugin.cssmin())
        .pipe(plugin.rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('./dist'))
});

gulp.task('js', function () {
    return gulp.src([
    		'./dist/swiper.js'
    	])
        .pipe(plugin.uglify().on('error', function(e){
            console.log(e)
        }))
        .pipe(plugin.rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('concat', function () {
    return gulp.src([
            './src/device.js',
    		'./src/swiper.js'
        ])
        .pipe(concat('./swiper.js'))
        .pipe(gulp.dest('./dist'));
});

// gulp.task('copy', function () {
//     return gulp.src([
//             './index.html',
//         ])
//         .pipe(gulpCopy('./dist'));
// });

// gulp.task('replace', function() {
//     return gulp.src('./dist/index.html')
//         .pipe(htmlreplace({
//             'css': './style.min.css',
//             'js': './swiper.effect.min.js'
//         }))
//         .pipe(gulp.dest('./dist'));
// });

// gulp.task('swiper-concat', function () {
//     return gulp.src([
//             './swiper.js',
//             './effect.js'
//         ])
//         .pipe(concat('./swiper.effect.js'))
//         .pipe(gulp.dest('./dist'));
// });


gulp.task('default', function(){
    return runSequence('clean', 'css', 'concat', 'js');
});