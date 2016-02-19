
var Sensors = (function () {
    var
        geoLocation,
        geoOptions = {
            maximumAge: 3000,
            timeout: 10000,
            enableHighAccuracy: false
        },
        geoWatchId,
        lastSavedLocation,
        gyroNorm,
        gyroOptions = {
            frequency: 500,
            gravityNormalized: true,
            /* Can be GyroNorm.GAME or GyroNorm.WORLD.
             * gn.GAME returns orientation values with respect to the head direction of the device.
             * gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
             */
            orientationBase: GyroNorm.WORLD,
            decimalCount: 2,
            logger: function (data) {
                console.log(data);
            },
            // If set to true it will return screen adjusted values
            screenAdjusted: true
        },
        lastSavedOrientation,
        gyroNormLoadedDeferred = $.Deferred();

    function dummyGeo() {
        console.log('dummyGeo');
        // onSuccess Callback
        // This method accepts a Position object, which contains the
        // current GPS coordinates
        //
        var onSuccess = function (position) {
            console.log('Latitude: ' + position.coords.latitude + '\n' +
                'Longitude: ' + position.coords.longitude + '\n' +
                'Altitude: ' + position.coords.altitude + '\n' +
                'Accuracy: ' + position.coords.accuracy + '\n' +
                'Altitude Accuracy: ' + position.coords.altitudeAccuracy + '\n' +
                'Heading: ' + position.coords.heading + '\n' +
                'Speed: ' + position.coords.speed + '\n' +
                'Timestamp: ' + position.timestamp + '\n');
        };

        // onError Callback receives a PositionError object
        //
        function onError(error) {
            console.log('code: ' + error.code + '\n' +
                'message: ' + error.message + '\n');
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    }

    return {
        init: function () {
            console.log('motion');
            geoLocation = navigator.geolocation;

            gyroNorm = new GyroNorm();
            gyroNorm.init(gyroOptions)
                .then(function () {
                    console.log('gn resolving');
                    gyroNormLoadedDeferred.resolve();
                });

            dummyGeo();
        },
        start: function () {

            gyroNorm.start(function (data) {
                /*
                 * given: phone on flat surface, screen up
                 * alpha: around z-axis/yaw; 0(north)-359 deg, increments counter-clockwise
                 * beta: x-axis/pitch; increments by tilting screen towards you
                 *  --> 90° = screen towards you,
                 *  --> -90° = screen away
                 *  --> 180° = screen down;
                 * gamma: y-axis/roll; increments clockwise till 90°
                 */
                // console.log('data:' + '\n' +
                //     'alpha:' + data.do.alpha + '\n' +
                //     'beta:' + data.do.beta + '\n' +
                //     'gamma:' + data.do.gamma + '\n' +
                //     'motion x:' + data.dm.gx + '\n' +
                //     'motion y:' + data.dm.gy + '\n' + // neg = roll cc
                //     'motion z:' + data.dm.gz);

                lastSavedOrientation = data;
            });

            geoLocation.getCurrentPosition(function (position) {
                lastSavedLocation = position;
            })
            geoWatchId = geoLocation.watchPosition(function (position) {
                console.log('watching');
                lastSavedLocation = position;
            }, function (error) {
                // error function
                console.warn('geoLocation error: ' +
                    'code: ' + error.code + '\n' +
                    'message: ' + error.message + '\n');
            }, geoOptions);
        },
        stop: function () {
            gyroNorm.stop();
        },
        gyroNormLoadedDeferred: function () {
            return gyroNormLoadedDeferred;
        },
        getOrientation: function () {
            return lastSavedOrientation;
        },
        getLocation: function () {
            return lastSavedLocation;
        }
    };
}());

/**
 * @type {}
 */
var CamUtils = (function () {
    var
        previewConstraints = {},
        cameraDirection = 'back',
        previewTapEnabled = false,
        previewDragEnabled = false,
        previewBehindWebView = true;

    return {
        init: function () {
            previewConstraints = {
                x: $('#viewer').position().left,
                y: $('#viewer').position().top,
                width: $('#viewer').width(),
                height: $('#viewer').height()
            };
        },
        startCamera: function () {
            console.log('starting camera');
            cordova.plugins.camerapreview.startCamera(previewConstraints, cameraDirection,
                previewTapEnabled, previewDragEnabled, previewBehindWebView);
        },
        stopCamera: function () {
            console.log('stopping camera');
            cordova.plugins.camerapreview.stopCamera();
        }
    };
}());