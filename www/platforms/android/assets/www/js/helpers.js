var UiHelper = (function () {
    function setupProgressBar() {
        $('#progress_bar').progressbar({
            value: false,
            change: function () {
                var
                    max = $('#progress_bar').progressbar('option', 'max'),
                    value = $('#progress_bar').progressbar('value'),
                    p = 0,
                    text = '';

                p = Math.floor((value * 100) / max);
                text = p + '%';

                return $('.progress_text').text(text);
            },
            complete: function () {
                $('.progress_text').text('Done!');
                $('#loading-ui').fadeOut(800, function () {
                    $('#control-ui').fadeIn(200);
                });
            }
        });
    }

    function setupLoadingUi() {
        setupProgressBar();

        $('#loading-ui').fadeIn(800);
    }

    function setupEventHandlers() {
        $(":mobile-pagecontainer").on("pagecontainershow", function (event, ui) {
            if (ui.toPage.is($('#viewer'))) {
                console.log('#viewer');

                var container = $('#container');
                container.css({
                    'width': $('#viewer').innerWidth(),
                    'height': $('#viewer').innerHeight()
                });


                // var r = Graphics.getRenderer().domElement;
                // $(r).css({
                //     'background-color': 'transparent'
                // });

                $(window).on("navigate", function (event, data) {
                    var direction = data.state.direction;
                    if (direction === 'back') {
                        // do something
                        console.log('changing');
                        $('body').pagecontainer('change', $('#preface'));
                    }
                    console.log(direction);
                });

                CamUtils.startCamera();

                $.when(Sensors.gyroNormLoadedDeferred, Graphics.scenePreparedDeferred)
                    .done(function () {
                        Sensors.start();
                        Graphics.renderScene();
                    });
            } else {
                CamUtils.stopCamera();
                Sensors.stop();
            }
        });
    }

    return {
        init: function () {
            setupLoadingUi();
            setupEventHandlers();
            // Graphics.setupScene();
        },
        updateBar: function (method, option, value) {
            return $('#progress_bar').progressbar(method, option, value);
        }
    };
}());



/**
 * @type {}
 */
var Utils = (function () {
    'use strict';

    return {
        /* Request header 'Content-Type' defaults to 'application/de.hsb.betaville+json' if argument contains empty string.*/
        /**
         * Builds an XMLHttpRequest according to [MDN] {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest}
         *
         * @method     getRequest
         * @memberof   Utils
         * @param      {string}    url          The URL to send the request to
         * @param      {string}    contentType  Adds a request header with this content type, may be null or empty ('')
         * @param      {Function}  callback     A function to be called when the request has returned a response. In case of any HTTP status other than "200 OK", this MAY return null!
         */
        getRequest: function (url, contentType, callback) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            if (contentType === '' || contentType === null) {
                request.setRequestHeader('Content-Type',
                    FinalConstants.HTTP_REQUEST_CONTENT_TYPE_BETAVILLE_JSON);
            } else {
                request.responseType = contentType;
            }

            request.onerror = function (error) {
                console.log('XHR error: ');
                console.log(error);
            };

            request.onload = function () {
                if (request.status !== 200) {
                    console.error('GET Request failed' + ', Status: ' + request.status);
                    console.error(request);
                }
                if (typeof callback === 'function') {
                    callback(request.response);
                }
            };
            request.send();
        },
        /**
         * Calculates the distance between the longitudes of two points.
         *
         * @method     distanceWestEast
         * @memberof   Utils
         * @param      {object}  point1  Start point, distance FROM
         * @param      {object}  point2  End point, distance TO
         * @return     {number}  Ddistance in meters
         */
        distanceWestEast: function (point1, point2) {
            var latAverage = (point2.latitude + point1.latitude) / 2 * (Math.PI / 180);
            var dx = 111.3 * Math.cos(latAverage) * (point2.longitude - point1.longitude);
            // console.log('1: ' + point1 + ' 2: ' + point2 + ' dx: ' + (dx * 1000));
            return Math.round(dx * 1000);
        },
        /**
         * Calculates the distance between the latitudes of two points.
         *
         * @method     distanceSouthNorth
         * @memberof   Utils
         * @param      {object}  point1  Start point, distance FROM
         * @param      {object}  point2  End point, distance TO
         * @return     {number}  Distance in meters
         */
        distanceSouthNorth: function (point1, point2) {
            var dy = 111.3 * (point2.latitude - point1.latitude);
            // console.log('1: ' + point1 + ' 2: ' + point2 + ' dy: ' + (dy * 1000));
            return Math.round(dy * 1000);
        }
    };
}());
