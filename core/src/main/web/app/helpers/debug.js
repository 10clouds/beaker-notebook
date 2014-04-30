/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
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
 * M_bkDebug
 * This module is for debug only and should never be used in code
 */
(function() {
  'use strict';
  var module = angular.module("M_bkDebug", [
    "M_angularUtils",
    "M_bkApp",
    "M_bkCellPluginManager",
    "M_bkCore",
    'M_bkSessionManager',
    "M_bkHelper",
    "M_bkOutputLog",
    "M_bkRecentMenu",
    "M_bkSession",
    "M_bkShare",
    "M_bkTrack",
    "M_bkUtils",
    "M_cometd",
    "M_generalUtils",
    "M_bkMenuPluginManager",
    "M_bkEvaluatePluginManager",
    "M_bkEvaluatorManager",
    "M_bkEvaluateJobManager"
  ]);
  module.factory("bkDebug", function(
      $injector, angularUtils, bkEvaluateJobManager, bkCellPluginManager, bkSessionManager,
      bkCoreManager, bkHelper, bkOutputLog, bkRecentMenu, bkSession, bkShare,
      trackingService, bkUtils, cometd, generalUtils, bkMenuPluginManager, bkEvaluatePluginManager,
      bkEvaluatorManager) {
    return {
      $injector: $injector,
      angularUtils: angularUtils,
      bkEvaluateJobManager: bkEvaluateJobManager,
      bkCellPluginManager: bkCellPluginManager,
      bkSessionManager: bkSessionManager,
      bkCoreManager: bkCoreManager,
      bkHelper: bkHelper,
      bkOutputLog: bkOutputLog,
      bkRecentMenu: bkRecentMenu,
      bkSession: bkSession,
      bkShare: bkShare,
      trackingService: trackingService,
      bkUtils: bkUtils,
      cometd: cometd,
      generalUtils: generalUtils,
      bkMenuPluginManager: bkMenuPluginManager,
      bkEvaluatePluginManager: bkEvaluatePluginManager,
      bkEvaluatorManager: bkEvaluatorManager
    };
  });
})();
