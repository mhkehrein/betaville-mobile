/* global zip, cordova, FileError, FileTransferError, THREE, GyroNorm */

var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();

var debug = true;

/**
 Serves as storage for constants as to not clutter the global namespace. Singleton

 @return     {Object}  An Object; properties contain the constants.
 */
var FinalConstants = (function () {
    'use strict';
    var constants = {
        // Comment out which URL isn't needed:
        // Live server:
        // BETAVILLE_BASE_URL: 'http://betaville.hs-bremen.de:8080/betaville-server',
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

$(document).on("deviceready", function () {
    deviceReadyDeferred.resolve();
});

$(document).on("mobileinit", function () {
    jqmReadyDeferred.resolve();
});

$.when(deviceReadyDeferred, jqmReadyDeferred)
    .then(init);

// TODO: This is only here for testing.
// Should you find this in the final version, send me a screencap
// and I shall hang my head in shame.
$(document).ready(function () {
    if (typeof cordova === 'undefined') {
        //        init();
        console.log('no cordova');
        // TODO: Delete the download button - used for browser testing

        $('#preface-main .ui-content').prepend(
            '<button type="submit" id="button_download" class="ui-btn ui-btn">Download project data</button>');

        $('#button_download').tap(function () {
            $('#button_download').hide();
            init();
            UiHelper.updateBar('option', 'max', 5);
            UiHelper.updateBar('value', 5);
        });
    }
});

function init() {
    console.log('init');

    UiHelper.init();

    Loader.init();
    CamUtils.init();

    Sensors.init();

    Graphics.init();
}



var debugProject = {
    "description": "Lorem ipsum",
    "end": 1362006000000,
    "start": 1334181600000,
    "title": "Debug Project",
    "area": {
        "coordinates": [{
            "latitude": 53.09323642431395,
            "longitude": 8.806035526983603,
            "altitude": 4.930951595306396
        }, {
            "latitude": 53.09294651638988,
            "longitude": 8.80642719206539,
            "altitude": 6.042943954467773
        }, {
            "latitude": 53.09279187823313,
            "longitude": 8.805938946063193,
            "altitude": 5.279983520507812
        }, {
            "latitude": 53.0931623390238,
            "longitude": 8.805574114324912,
            "altitude": 6.427638053894043
        }],
        "center": {
            "latitude": 53.09301585563455,
            "longitude": 8.80598727785809,
            "altitude": 5.1528206
        }
    },
    "proposals": [{
        "name": "debug playground",
        "open": false,
        "description": "Nice playground for the debug",
        "proposals": [],
        "headVersion": {
            "childVersions": [],
            "label": "a4fca2f7-7880-47b8-b15f-fdc2b6d13c13",
            "models": [{
                "centerPoint": {
                    "latitude": 53.093120419675056,
                    "longitude": 8.806115940354347,
                    "altitude": 4.612884998321533
                },
                "orientation": [0.0, 151.0, 0.0],
                "packageFilename": "774842143e21487dabb871e15c1649fb.zip",
                "filepath": "/api/files/774842143e21487dabb871e15c1649fb.zip",
                "standardModel": false,
                "scalable": false,
                "scale": [1.0, 1.0, 1.0],
                "text": null,
                "creator": "/api/users/1146",
                "createdAt": 1335376865036,
                "modifiedAt": 1335376865037,
                "temporary": null,
                "id": 2899,
                "url": "/api/models/2899"
            }],
            "creator": "/api/users/1146",
            "createdAt": 1335376864964,
            "modifiedAt": 1335376864965,
            "temporary": null,
            "id": 2898,
            "url": "/api/versions/2898"
        },
        "creator": "/api/users/1146",
        "createdAt": 1335376864949,
        "modifiedAt": 1335376865037,
        "temporary": null,
        "id": 2896,
        "url": "/api/proposals/2896"
    }, {
        "name": "test",
        "open": false,
        "description": "test",
        "proposals": [],
        "headVersion": {
            "childVersions": [],
            "label": "940ac7b8-4461-4bda-84d5-841e5f3e5890",
            "models": [{
                "centerPoint": {
                    "latitude": 53.093120419675056,
                    "longitude": 8.806115940354347,
                    "altitude": 4.612884998321533
                },
                "orientation": [0.0, 25.135025, 0.0],
                "packageFilename": "standard-library-object.zip",
                "filepath": "/api/files/standard-library-object.zip",
                "standardModel": true,
                "scalable": true,
                "scale": [1.0, 1.0, 1.0],
                "text": "test",
                "creator": "/api/users/1146",
                "createdAt": 1339534444167,
                "modifiedAt": 1341078892448,
                "temporary": null,
                "id": 3175,
                "url": "/api/models/3175"
            }, {
                "centerPoint": {
                    "latitude": 53.09297228330078,
                    "longitude": 8.806196412658691,
                    "altitude": 0.0
                },
                "orientation": [0.0, 24.035294, 0.0],
                "packageFilename": "standard-library-object.zip",
                "filepath": "/api/files/standard-library-object.zip",
                "standardModel": true,
                "scalable": true,
                "scale": [0.9999999, 1.0, 0.9999999],
                "text": "teest",
                "creator": "/api/users/1146",
                "createdAt": 1339534444170,
                "modifiedAt": 1341078893110,
                "temporary": null,
                "id": 3176,
                "url": "/api/models/3176"
            }, {
                "centerPoint": {
                    "latitude": 53.0931107034668,
                    "longitude": 8.80571902241211,
                    "altitude": 0.0
                },
                "orientation": [0.0, 26.994461, 0.0],
                "packageFilename": "standard-library-object.zip",
                "filepath": "/api/files/standard-library-object.zip",
                "standardModel": true,
                "scalable": true,
                "scale": [1.0, 1.0, 1.0],
                "text": "test",
                "creator": "/api/users/1146",
                "createdAt": 1339534444172,
                "modifiedAt": 1341078893723,
                "temporary": null,
                "id": 3177,
                "url": "/api/models/3177"
            }],
            "creator": "/api/users/1146",
            "createdAt": 1339534444136,
            "modifiedAt": 1339534444137,
            "temporary": null,
            "id": 3174,
            "url": "/api/versions/3174"
        },
        "creator": "/api/users/1146",
        "createdAt": 1339534444086,
        "modifiedAt": 1339534444174,
        "temporary": null,
        "id": 3172,
        "url": "/api/proposals/3172"
    }],
    "freezes": [{
        "location": {
            "latitude": 53.09299486303711,
            "longitude": 8.80572976418457,
            "altitude": 5.0
        },
        "orientation": [65.0, -2.0, -89.0],
        "filename": "291be883832e4991962bb3bc79baa001.jpeg",
        "filepath": "/api/files/291be883832e4991962bb3bc79baa001.jpeg",
        "creator": "/api/users/1146",
        "createdAt": 1340208124839,
        "modifiedAt": 1340208125239,
        "temporary": null,
        "id": 3316,
        "url": "/api/freezes/3316"
    }],
    "creator": "/api/users/1146",
    "createdAt": 1335376686521,
    "modifiedAt": 1340208125401,
    "temporary": null,
    "id": 2894,
    "url": "/api/projects/2894"
};
