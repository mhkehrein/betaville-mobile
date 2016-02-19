/**
 * Loads Freezes and Proposals into ViewerData.
 * Singleton
 *
 * @class
 */
var Loader = (function () {
    'use strict';
    var
        projectsLoadedDeferred = $.Deferred(),
        projectsParsedDeferred = $.Deferred();


    // Private methods

    function loadAllProjects() {
        // TODO: Remove/use filter!
        var url = FinalConstants.BETAVILLE_BASE_URL +
            FinalConstants.PROJECTS_API_URL; // + 'filter';
        //        url = url + '?radius=10000' + '&location=bremen';// + '&lat=53.05515377612419' + '&lng=8.784655519638022';

        // TODO: Handle timeouts!
        Utils.getRequest(url, '', function (response) {
            var projects = $.parseJSON(response);
            ViewerData.setProjects(projects);
            projectsLoadedDeferred.resolve();
        });
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
        projectsParsedDeferred.resolve(urls, fileNames);
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

        UiHelper.updateBar('option', 'max', urls.length);
        UiHelper.updateBar('value', 0);

        // TODO: Delete clause. May be undefined in a Browser setting.
        if (typeof cordova !== 'undefined') {
            var
            // Initiate plugin
                fileTransfer = new FileTransfer(),
                // Get the device's private & persistent application storage directory
                localDir = cordova.file.dataDirectory,
                progressValue = 0;


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

                    directoryEntry.getFile(fileNames[index], {
                            create: false
                        },
                        function (file) {
                            UiHelper.updateBar('value', (progressValue += 1));
                        },
                        function (error) {
                            if (error.code === FileError.NOT_FOUND_ERR) {
                                // File not found >> Download!
                                fileTransfer.download(source, target, function (entry) {
                                    console.log("Download complete: " + entry.toURL());
                                    //                                    $('#progressbar').progressbar('value', (progressValue += 1));
                                    UiHelper.updateBar('value', (progressValue += 1));
                                    // TODO: error = user feedback!
                                }, fileTransferErrorHandler.bind(null, fileName));
                            } else {
                                // Other errors get forwarded
                                fileSystemErrorHandler.bind(null, fileName);
                            }
                        });
                });
                // TODO: When done, user feedback >> progressbar
                // If this gets thrown, there's something wrong with adressing the system.
            }, fileSystemErrorHandler.bind(null, localDir));
        }
    }

    function loadZip(file, modelId) {
        var windowUrl = window.URL || window.webkitURL || window.mozURL;
        var fileName,
            fileEnding;

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
        init: function () {
            loadAllProjects();

            $.when(projectsLoadedDeferred)
                .then(loadProposals);
            $.when(projectsParsedDeferred)
                .then(initModelFilesTransfer);

            // get project ids
            // get proposals from ids
            // get models from proposals
        }
    };
}());