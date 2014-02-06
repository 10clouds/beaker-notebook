/*
 *  Copyright 2014 TWO SIGMA INVESTMENTS, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * R eval plugin
 * For creating and config evaluators that evaluate R code and update code cell results.
 */
(function () {
    'use strict';
    var url = "./plugin/evaluator/r.js";
    var PLUGIN_NAME = "R";
    var COMMAND = "rPlugin";

    var serverUrl = "/rsh/";
    var subscriptions = {};

    var cometd = new $.Cometd();
    var initialized = false;
    var cometdUtil = {
        init: function () {
            if (!initialized) {
                cometd.unregisterTransport("websocket");
                cometd.init(serverUrl + "cometd");
                initialized = true;
            }
        },
        subscribe: function (update_id, callback) {
            if (!update_id) {
                return;
            }
            if (subscriptions[update_id]) {
                cometd.unsubscribe(subscriptions[update_id]);
                subscriptions[update_id] = null;
            }
            var cb = function (ret) {
                callback(ret.data);
            };
            var s = cometd.subscribe('/object_update/' + update_id, cb);
            subscriptions[update_id] = s;
        },
        unsubscribe: function (update_id) {
            if (!update_id) {
                return;
            }
            if (subscriptions[update_id]) {
                cometd.unsubscribe(subscriptions[update_id]);
                subscriptions[update_id] = null;
            }
        },
        addStatusListener: function (cb) {
            cometd.addListener("/meta/connect", cb);
        }
    };
    var R = {
        pluginName: PLUGIN_NAME,
        cmMode: "r",
        background: "#C0CFF0",
        newShell: function (shellID, cb) {
            if (!shellID) {
                shellID = "";
            }
            $.ajax({
                type: "POST",
                datatype: "json",
                url: serverUrl + "rest/rsh/getShell",
                data: {shellid: shellID}
            }).done(cb).fail(function () {
                console.log("failed to create shell", arguments);
            });
        },
        evaluate: function (code, modelOutput) {
            var deferred = Q.defer();
            var self = this;
            var progressObj = {
                type: "BeakerDisplay",
                innertype: "Progress",
                object: {
                    message: "submitting ...",
                    startTime: new Date().getTime()
                }
            };
            modelOutput.result = progressObj;
            $.ajax({
                type: "POST",
                datatype: "json",
                url: serverUrl + "rest/rsh/evaluate",
                data: {shellID: self.settings.shellID, code: code}
            }).done(function (ret) {
                var onUpdatableResultUpdate = function (update) {
                    modelOutput.result = update;
                    bkHelper.refreshRootScope();
                };
                var onEvalStatusUpdate = function (evaluation) {
                    modelOutput.result.status = evaluation.status;
                    if (evaluation.status === "FINISHED") {
                        cometdUtil.unsubscribe(evaluation.update_id);
                        modelOutput.result = evaluation.result;
                        if (evaluation.result.update_id) {
                            cometdUtil.subscribe(evaluation.result.update_id, onUpdatableResultUpdate);
                        }
                        modelOutput.elapsedTime = new Date().getTime() - progressObj.object.startTime;
                        deferred.resolve();
                    } else if (evaluation.status === "ERROR") {
                        cometdUtil.unsubscribe(evaluation.update_id);
                        modelOutput.result = {
                            type: "BeakerDisplay",
                            innertype: "Error",
                            object: evaluation.result
                        };
                        modelOutput.elapsedTime = new Date().getTime() - progressObj.object.startTime;
                        deferred.resolve();
                    } else if (evaluation.status === "RUNNING") {
                        progressObj.object.message = "evaluating ...";
                        modelOutput.result = progressObj;
                    }
                    bkHelper.refreshRootScope();
                };
                onEvalStatusUpdate(ret);
                if (ret.update_id) {
                    cometdUtil.subscribe(ret.update_id, onEvalStatusUpdate);
                }
            });
            return deferred.promise;
        },
        autocomplete: function (code, cpos, cb) {
            var self = this;
            $.ajax({
                type: "POST",
                datatype: "json",
                url: serverUrl + "rest/rsh/autocomplete",
                data: {shellID: self.settings.shellID, code: code, caretPosition: cpos}
            }).done(function (x) {
                cb(x);
            });
        },
        exit: function (cb) {
            var self = this;
            $.ajax({
                type: "POST",
                datatype: "json",
                url: serverUrl + "rest/rsh/exit",
                data: { shellID: self.settings.shellID }
            }).done(cb);
        },
        spec: {
        },
        cometdUtil: cometdUtil
    };

    var init = function () {
        $.ajax({
            type: "POST",
            datatype: "json",
            url: "/beaker/rest/startProcess/runCommand",  // note this is not based on serverUrl
            data: {
                flag: PLUGIN_NAME,
                command: COMMAND,
                started: "Server started",
                nginx: "location /rsh/ {proxy_pass http://127.0.0.1:%(port)s/;}",
                waitfor: "org.eclipse.jetty.server.AbstractConnector - Started SelectChannelConnector",
                record: "true",
                stream: "stdout"
            }
        }).done(function (ret) {
            if (bkHelper.restartAlert(ret)) {
                return;
            }
            cometdUtil.init();
            var RShell = function (settings, cb) {
                var self = this;
                var setShellIdCB = function (id) {
                    if (id.value !== settings.shellID) {
                        // console.log("A new R shell was created.");
                    }
                    settings.shellID = id.value;
                    self.settings = settings;
                    cb();
                };
                if (!settings.shellID) {
                    settings.shellID = "";
                }
                this.newShell(settings.shellID, setShellIdCB);
                this.perform = function (what) {
                    var action = this.spec[what].action;
                    this[action]();
                };
            };
            RShell.prototype = R;
            bkHelper.getLoadingPlugin(url).onReady(RShell);
        }).fail(function () {
            console.log("process start failed", arguments);
        });
    };
    init();
})();
