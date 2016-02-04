/* global zip */

var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();

/*
 Serves as storage for constants as to not clutter the global namespace. Singleton

 @return     {Object}  An Object; properties contain the constants.
 */
var FinalConstants = (function () {
    'use strict';
    var constants = {
        // http url for local testing, relative url on live server. Comment when not needed:
//        BETAVILLE_BASE_URL: '/betaville-server',
//        BETAVILLE_BASE_URL: 'http://betaville.hs-bremen.de:8080/betaville-server',
        BETAVILLE_BASE_URL: 'http://betaville.hs-bremen.de:8080/betaville-server',
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
            freezes = [],
            modelsInProposal = null,
            project,
            proposalId;

    // Public methods
    return {
        setFreezes: function (freezesFromJson) {
            freezes = (Array.isArray(freezesFromJson) ? freezesFromJson : []);
            return (freezes.length > 0);
        },
        getFreezes: function () {
            return freezes;
        },
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
            jQuery.each(modelsInProposal, function (index, model) {
                if (fileName === model.packageFilename) {
                    matchingModel = model;
                    return false;
                }
            });
            return matchingModel;
        },
        setModelBlobUrls: function (modelId, objBlob, mtlBlob) {
            jQuery.each(modelsInProposal, function (index, listEntry) {
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
            return Number(project.id);
        },
        setProject: function (projectObject) {
            project = projectObject;
        },
        getProject: function () {
            return project;
        }
    };
}());

/**
 * Loads Freezes and Proposals into ViewerData.
 * Singleton
 */
var Loader = (function () {
    'use strict';

    // Private methods
    function loadAllProjects() {
        var url = FinalConstants.BETAVILLE_BASE_URL + FinalConstants.PROJECTS_API_URL;

        Utils.getRequest(url, '', function (response) {
            var project = jQuery.parseJSON(response);

            ViewerData.setProject(project);
        });
    }

    function extractProjectId() {
        var href = jQuery(FinalConstants.JQ_SELECTOR_TO_PROJECT_ID)
                .attr('href');
        var id = href.substr(href.indexOf(FinalConstants.SEARCH_KEY_PROJECT_ID) +
                FinalConstants.SEARCH_KEY_PROJECT_ID.length, FinalConstants.PROJECT_ID_LENGTH);
        return id;
    }

    function loadFreezes(projectId) {
        console.log("Downloading freezes…");
        var url = FinalConstants.BETAVILLE_BASE_URL + FinalConstants.PROJECTS_API_URL + projectId + '/freezes';

        Utils.getRequest(url, '', function (response) {
            var freezesJson = jQuery.parseJSON(response);
            handleFreezes(freezesJson);
        });
    }

    function handleFreezes(freezesJson) {
        var freezes = [];
        jQuery.each(freezesJson, function (index, freeze) {
            freezes.push(freeze);
        });
        ViewerData.setFreezes(freezes);
    }

    function loadProposals(projectId) {
        var url = FinalConstants.BETAVILLE_BASE_URL + FinalConstants.PROJECTS_API_URL + projectId + '/proposals';

        Utils.getRequest(url, '', function (response) {
            var proposalId = getProposalId();
            var proposalsJson = jQuery.parseJSON(response);

            jQuery.each(proposalsJson, function (index, proposal) {
                if (proposal.id === proposalId) {
                    ViewerData.setModels(proposal.headVersion.models);
                    ViewerData.setProposalId(proposalId);
                    initModelFilesTransfer();
                    return false;
                }
            });
        });
    }

    function loadProject(projectId) {
        // TODO: fill
        var url = FinalConstants.BETAVILLE_BASE_URL + FinalConstants.PROJECTS_API_URL + projectId;

        Utils.getRequest(url, '', function (response) {
            var project = jQuery.parseJSON(response);
            ViewerData.setProject(project);
        });
    }

    function getProposalId() {
        var href = jQuery(FinalConstants.JQ_SELECTOR_TO_PROPOSAL_ID)
                .attr('href');
        var id = href.substr(href.indexOf(FinalConstants.SEARCH_KEY_PROPOSAL_ID) +
                FinalConstants.SEARCH_KEY_PROPOSAL_ID.length, FinalConstants.PROPOSAL_ID_LENGTH);
        return Number(id);
    }

    function initModelFilesTransfer() {
        console.log("Downloading model files…");
        // TODO: Check if getModels() !== null; Need to implement a wait cycle or something
        var models = ViewerData.getModels();
        var url = [],
                modelIds = [];

        jQuery.each(models, function (index, model) {
            url.push(FinalConstants.BETAVILLE_BASE_URL + model.filepath);
            modelIds.push(model.id);
        });

        jQuery.each(modelIds, function (index, modelId) {
            Utils.getRequest(url[index], 'blob', function (response) {
                loadZip(response, modelId);
            });
        });
    }

    function loadZip(file, modelId) {
        var windowUrl = window.URL || window.webkitURL || window.mozURL;
        var fileName, fileEnding, modelId;

        // 'zip' refers to zip.js library and corresponding objects
        zip.workerScriptsPath = FinalConstants.WORKER_SCRIPTS_PATH;

        zip.createReader(new zip.BlobReader(file), function (reader) {
            reader.getEntries(function (entries) {
                if (entries.length) {
                    jQuery.each(entries, function (index, entry) {
                        fileName = entry.filename;
                        fileEnding = fileName.substr(-3);
                        getEntryData(entry, fileEnding, modelId);
                    });
                }
            },
                    function (error) {
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
            loadAllProjects();
            console.log(ViewerData.getProject());
//            var projectId = extractProjectId();
//            loadProject(projectId);
//
//            loadFreezes(projectId);
//            loadProposals(projectId);
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
    deviceReadyDeferred.resolve();
});

$(document).on("mobileinit", function () {
    jqmReadyDeferred.resolve();
});

$.when(deviceReadyDeferred, jqmReadyDeferred).then(init);

function init() {
    Loader.load();
//    loadProject();
}

