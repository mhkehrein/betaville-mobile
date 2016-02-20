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
            frequency: 100,
            gravityNormalized: false,
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
            screenAdjusted: false
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

    function adjustDataToScreen(data) {

        /*
         * Elaboration on Euler angles and phone axes:
         *
         * If phone lies on a flat surface, screen up, top pointing away:
         *
         *              z
         *            |
         *      y  \  |
         *          \ |
         *           \|______
         *                  x
         *
         * Angles are described as Euler angles - simplified:
         * yaw/alpha angle: Rotation around z-axis = compass direction
         * pitch/beta angle: Rotation around x-axis = front-back tilt
         * roll/gamma angle: Rotation around y-axis = left-right tilt
         *
         * What we need is a device in landscape, screen facing us:
         *              x
         *                |
         *  Variant Left  |         Variant Right
         *  Top <--       |          Top -->
         *          ______|          ______
         *        y      /         /|      y
         *              /         / |
         *             /      z  /  | x
         *           z
         *
         * However: In OpenGL world space, axes are defined as follows:
         *
         *             y
         *           |
         *           |
         *           |
         *           |______
         *          /        x
         *         /
         *      z /
         *
         *
         *
         */

        var alpha = data.do.alpha,
            gamma = data.do.gamma,
            alphaAdjusted,
            gammaAdjusted,
            pitch,
            roll,
            yaw;

        /*
         * Alpha flips 180° if phone is on its side, no matter which way the screen is facing.
         * Values are correct as long as the phone's x-axis is at an incline (= gamma is positive).
         */
        alpha = (gamma < 0) ? alpha : SensorUtils.rotateCcw(alpha, 180);

        /*
         * We want gamma to be 0 when we're holding the phone in landscape
         */
        gammaAdjusted = (gamma < 0) ? ((gamma + 90) * -1) : (90 - gamma);

        /* Get device motion with gravity for device's y-axis.
         * A negative value suggests above variant Left, a positive one variant Right
         */
        if (data.dm.gy <= 0) {
            alphaAdjusted = SensorUtils.rotateCcw(alpha, -90);
        } else {
            alpha = SensorUtils.rotateCcw(alpha, 180);
            alphaAdjusted = SensorUtils.rotateCcw(alpha, 90);
            gammaAdjusted *= -1;
        }

        data.do.alpha = alphaAdjusted;
        data.do.gamma = gammaAdjusted;

        /*
         * three.js requires these angles as radians - since we want to refrain from cluttering the rendering with too many calculations, we do that here
         */
        data.pitch = THREE.Math.degToRad(beta); // around x-axis
        data.roll = THREE.Math.degToRad(gamma); // around y-axis
        data.yaw = THREE.Math.degToRad(alpha); // around z-axis

        return data;
    }

    return {
        init: function () {
            console.log('motion');
            geoLocation = navigator.geolocation;

            gyroNorm = new GyroNorm();
            gyroNorm.init(gyroOptions)
                .then(function () {
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

                // var gnA = gyroNorm.isAvailable();
                // console.log('deviceOrientationAvailable: ' + gnA.deviceOrientationAvailable)
                // console.log('accelerationAvailable: ' + gnA.accelerationAvailable);
                // console.log('accelerationIncludingGravityAvailable: ' + gnA.accelerationIncludingGravityAvailable);
                // console.log('rotationRateAvailable: ' + gnA.rotationRateAvailable);
                // console.log('compassNeedsCalibrationAvailable: ' + gnA.compassNeedsCalibrationAvailable);

                data = adjustDataToScreen(data);


                lastSavedOrientation = data;
            });

            geoLocation.getCurrentPosition(function (position) {
                lastSavedLocation = position;
            });

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

var SensorUtils = (function () {
    return {
        rotateCcw: function (angle, degrees) {
            var rotated,
                clockwise = (degrees < 0);

            if (degrees > 360 || degrees < -360) {
                var fullTurns = Math.floor(degrees / 360);
                degrees -= fullturns * 360;

                if (degrees === 0) {
                    return angle;
                }
            }

            var sum = degrees + angle;
            // if (angle <= degrees) {
            if (!clockwise) {
                rotated = (sum > 360) ? (sum - 360) : sum;
            } else {
                rotated = (sum < 0) ? (sum + 360) : sum;
            }

            // } else {
            // rotated = Math.sqrt((degrees + angle) * (degrees + angle));
            // }


            return rotated;
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
            if (typeof cordova === 'undefined') {
                return;
            }
            console.log('starting camera');
            cordova.plugins.camerapreview.startCamera(previewConstraints, cameraDirection,
                previewTapEnabled, previewDragEnabled, previewBehindWebView);
        },
        stopCamera: function () {
            if (typeof cordova === 'undefined') {
                return;
            }
            console.log('stopping camera');
            cordova.plugins.camerapreview.stopCamera();
        }
    };
}());
