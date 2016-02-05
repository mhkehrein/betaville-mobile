/* global zip, cordova */

var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();

/*
 Serves as storage for constants as to not clutter the global namespace. Singleton

 @return     {Object}  An Object; properties contain the constants.
 */
var FinalConstants = (function () {
    'use strict';
    var constants = {
        // Comment out which URL isn't needed:
        // Live server:
//         BETAVILLE_BASE_URL: 'http://betaville.hs-bremen.de:8080/betaville-server',
        // Test server:
        BETAVILLE_BASE_URL: 'http://195.37.176.183:8080/betaville-server',
        PROJECTS_API_URL: '/api/projects/',
        JQ_SELECTOR_TO_PROJECT_ID: '#breadcrumbs a[href*="proposals.jsf?projectId="]',
        JQ_SELECTOR_TO_PROPOSAL_ID: '#breadcrumbs a[href*="proposals.jsf?proposalId="]',
        SEARCH_KEY_PROJECT_ID: 'projectId=',
        SEARCH_KEY_PROPOSAL_ID: 'proposalId=',
        PROJECT_ID_LENGTH: 4,
        PROPOSAL_ID_LENGTH: 4,
        HTTP_REQUEST_CONTENT_TYPE_BETAVILLE_JSON: 'application/de.hsb.betaville+json',
        WORKER_SCRIPTS_PATH: '../lib/zipjs/'
    };

    return constants;
}());

/**
 * Stores references to Freezes and Models (including the loaded obj and mtl files). Singleton.
 *
 * @class
 * @return     {(Array|Object)}  { description_of_the_return_value }
 */
var ViewerData = (function () {
    'use strict';
    var
        modelsInProposal = null,
        projects,
        proposalId;

    // Public methods
    return {
        setModels: function (models) {
            modelsInProposal = (Array.isArray(models)) ? models : [];
            return (models.length > 0);
        },
        getModels: function () {
            return modelsInProposal;
        },
        /**
         * Returns the first model object which contains the given file name.
         *
         * @method     getModelFromName
         * @param      {string}  fileName  The name of the zip file to match the model object to.
         * @return     {object}  A Model object using the zip file of the given name, or null if there was no match.
         */
        getModelFromName: function (fileName) {
            var matchingModel = null;
            $.each(modelsInProposal, function (index, model) {
                if (fileName === model.packageFilename) {
                    matchingModel = model;
                    return false;
                }
            });
            return matchingModel;
        },
        setModelBlobUrls: function (modelId, objBlob, mtlBlob) {
            $.each(modelsInProposal, function (index, listEntry) {
                if (listEntry.id === modelId) {
                    listEntry.objBlobUrl = (objBlob !== null) ? objBlob : listEntry.objBlobUrl;
                    listEntry.mtlBlobUrl = (mtlBlob !== null) ? mtlBlob : listEntry.mtlBlobUrl;
                }
            });
        },
        setProposalId: function (id) {
            proposalId = Number(id);
        },
        getProposalId: function () {
            return proposalId;
        },
        setProjectId: function (id) {
            projectId = Number(id);
        },
        getProjectId: function () {
            // TODO: do something useful
            return Number(0);
        },
        setProjects: function (projectObject) {
            projects = projectObject;
        },
        getProjects: function () {
            return projects;
        }
    };
}());


/**
 * Loads Freezes and Proposals into ViewerData.
 * Singleton
 */
var Loader = (function () {
    'use strict';
    var projectsLoadedDeferred = $.Deferred();

    // Private methods

    function loadAllProjects() {
        // TODO: Remove/use filter!
        var url = FinalConstants.BETAVILLE_BASE_URL + FinalConstants.PROJECTS_API_URL; // + 'filter';
//        url = url + '?radius=10000' + '&location=bremen';// + '&lat=53.05515377612419' + '&lng=8.784655519638022';
        Utils.getRequest(url, '', function (response) {
            var projects = $.parseJSON(response);
            ViewerData.setProjects(projects);
            projectsLoadedDeferred.resolve();
        });
        return projectsLoadedDeferred;
    }

    function loadProposals() {
        var
            projects = ViewerData.getProjects(),
            urls = [],
            fileNames = [];

        // TODO: Iterate through every possible proposal -
        // Since the proposals can be recursively nested (see API or JSON),
        // we may not catch every possible proposal with this.
        /*
         * Iterate through the projects object, searching for the URLs
         * to the files associated with the various projects
         */
        $.each(projects, function (index, project) {
            var proposals = project.proposals;

            $.each(proposals, function (index, proposal) {
                var propHead = proposal.headVersion;

                if (propHead && propHead.models) {
                    var models = propHead.models;

                    $.each(models, function (index, model) {
                        var
                            modelId = model.id,
                            url = FinalConstants.BETAVILLE_BASE_URL + model.filepath;

                        // Since models may use the same file, we can check for duplicates
                        if (urls.indexOf(url) === -1) {
                            urls.push(url);
                            fileNames.push(model.packageFilename);
                        }
                    });
                }
            });
        });
        initModelFilesTransfer(urls, fileNames);
    }

    function initModelFilesTransfer(urls, fileNames) {
        console.log('Downloading model files…');



        var fileSystemErrorHandler = function (fileName, error) {
            var msg = '';

            switch (error.code) {
                case FileError.QUOTA_EXCEEDED_ERR:
                    msg = 'Storage quota exceeded';
                    break;
                case FileError.NOT_FOUND_ERR:
                    msg = 'File not found';
                    break;
                case FileError.SECURITY_ERR:
                    msg = 'Security error';
                    break;
                case FileError.INVALID_MODIFICATION_ERR:
                    msg = 'Invalid modification';
                    break;
                case FileError.INVALID_STATE_ERR:
                    msg = 'Invalid state';
                    break;
                default:
                    msg = 'Unknown error';
                    break;
            }
            console.error('File System Error (' + fileName + '): ' + msg);
        };

        var fileTransferErrorHandler = function (fileName, error) {
            var msg = '';

            switch (error.code) {
                case FileTransferError.FILE_NOT_FOUND_ERR:
                    msg = 'File could not be found';
                    break;
                case FileTransferError.INVALID_URL_ERR:
                    msg = 'URL invalid';
                    break;
                case FileTransferError.CONNECTION_ERR:
                    msg = 'Connection error';
                    break;
                case FileTransferError.ABORT_ERR:
                    msg = 'Aborted';
                    break;
                case FileTransferError.NOT_MODIFIED_ERR:
                    msg = 'Not modified';
                    break;
            }
            console.error('File Transfer Error (' + fileName + '): ' + msg + '\n' +
                'Load source: ' + error.source + '\n' +
                'Load target: ' + error.target + '\n' +
                'HTTP status: ' + error.http_status);
        };


        if (typeof cordova !== 'undefined') {

            var
                // Initiate plugin
                fileTransfer = new FileTransfer(),
                // Get the device's private & persistent application storage directory
                localDir = cordova.file.dataDirectory,
                progressValue = 0;

            $('#progressbar').progressbar('option', 'max', urls.length);
            $('#progressbar').progressbar('value', 0);


            /*
             * No need to download a file twice: Resolving the path in localDir to a URL gives us
             * a DirectoryEntry object, which in turn lets us search for existing files within
             * that directory.
             */
            window.resolveLocalFileSystemURL(localDir, function (directoryEntry) {

                $.each(fileNames, function (index, fileName) {
                    var
                        source = encodeURI(urls[index]),
                        // filetransfer plugin requires path to file, not folder:
                        target = localDir + fileNames[index];

                    directoryEntry.getFile(fileNames[index], {create: false},
                        function (file) {
                            console.log(file.name + ' already exists. Skipping download.');
                            $('#progressbar').progressbar('value', (progressValue += 1));
                        },
                        function (error) {
                            if (error.code === FileError.NOT_FOUND_ERR) {
                                // File not found >> Download!
                                fileTransfer.download(source, target, function (entry) {
                                    console.log("Download complete: " + entry.toURL());
                                    $('#progressbar').progressbar('value', (progressValue += 1));
                                    // TODO: error = user feedback!
                                }, fileTransferErrorHandler.bind(null, fileName));
                            } else {
                                // Other errors get forwarded
                                fileSystemErrorHandler.bind(null, fileName);
                            }
                        });
                });
                // If this gets thrown, there's something wrong with adressing the system.
            }, fileSystemErrorHandler.bind(null, localDir));
        }
    }

    function loadZip(file, modelId) {
        var windowUrl = window.URL || window.webkitURL || window.mozURL;
        var fileName, fileEnding;

        // 'zip' refers to zip.js library and corresponding objects
        zip.workerScriptsPath = FinalConstants.WORKER_SCRIPTS_PATH;

        zip.createReader(new zip.BlobReader(file), function (reader) {
            // createReader return function
            reader.getEntries(function (entries) {
                if (entries.length) {
                    $.each(entries, function (index, entry) {
                        fileName = entry.filename;
                        fileEnding = fileName.substr(-3);
                        getEntryData(entry, fileEnding, modelId);
                    });
                }
            }, function (error) {
                // getEntries onError
                console.error(error);
            });
        });

        function getEntryData(entry, fileEnding, modelId) {
            entry.getData(new zip.BlobWriter('text/plain'), function (blob) {
                var objectUrl = null;
                var materialUrl = null;
                if (fileEnding === 'obj') {
                    objectUrl = windowUrl.createObjectURL(blob);
                } else if (fileEnding === 'mtl') {
                    materialUrl = windowUrl.createObjectURL(blob);
                }
                ViewerData.setModelBlobUrls(modelId, objectUrl, materialUrl);
            });
        }
    }

    // Public methods
    return {
        load: function () {
            var loadedDeferred = loadAllProjects();
            $.when(loadedDeferred).then(loadProposals);

            // get project ids
            // get proposals from ids
            // get models from proposals
        }
    };
}());

var Utils = (function () {
    'use strict';

    return {
        /* Request header 'Content-Type' defaults to 'application/de.hsb.betaville+json' if argument contains empty string.*/
        /**
         * Builds an XMLHttpRequest according to [MDN] {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest}
         *
         * @method     getRequest
         * @param      {string}    url          The URL to send the request to
         * @param      {string}    contentType  Adds a request header with this content type, may be null or empty ('')
         * @param      {Function}  callback     A function to be called when the request has returned a response. In case of any HTTP status other than "200 OK", this MAY return null!
         */
        getRequest: function (url, contentType, callback) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            if (contentType === '' || contentType === null) {
                request.setRequestHeader('Content-Type', FinalConstants.HTTP_REQUEST_CONTENT_TYPE_BETAVILLE_JSON);
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

$(document).on("deviceready", function () {
//    var fileSys = window.resolveLocalFileSystemURL();
    deviceReadyDeferred.resolve();
});

$(document).on("mobileinit", function () {
    jqmReadyDeferred.resolve();
});

$.when(deviceReadyDeferred, jqmReadyDeferred).then(init);

// TODO: This is only here for testing.
// Should you find this in the final version, send me a screencap
// and I shall hang my head in shame.
$(document).ready(function () {
    if (typeof cordova === 'undefined') {
        init();
    }
});

function init() {
    console.log('init');
    $('#button_download').tap(function () {
        $('#button_download').hide();
        $('#progressbar').progressbar({
            value: false
        }).show();
        Loader.load();
    });
}

