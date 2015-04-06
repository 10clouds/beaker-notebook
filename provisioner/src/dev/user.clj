(ns user
  (:require [hawk.core :as hawk]
            [com.stuartsierra.component :as component]
            [clojure.tools.namespace.file :refer [read-file-ns-decl]]
            [clojure.tools.namespace.repl :refer [refresh refresh-all]]
            [bunsen.provisioner.service :refer [service]]))

(def ^:dynamic *service*)

(def config
  {:server-port 3001
   :docker-url "http://10.10.10.10:4243"
   :marathon-url "http://10.10.10.10:8000"
   :app-group "/bunsen-dev/beaker"
   :app-defaults {"mem" 100
                  "cpus" 0.1
                  "instances" 1
                  "container" {"type" "DOCKER"
                               "docker" {"image" "bunsen-beaker"
                                         "network" "BRIDGE"
                                         "portMappings" [{"containerPort" 8801}]}}}
   :container-port 8801
   :container-image "mojotech/bunsen-beaker"
   :container-prefix "bunsen-dev-beaker"
   :container-path "/mnt/scratch"
   :cookie-salt "r8T`628DaW90*?30)3qRx,2f8h?8(wG13:64K3=w00-8W7g962gM268D0lTS(Uq;^v15mY3gCj-u59k994_/@}W<"
   :local-cookie-path "../beaker/cookies"
   :scratch-space-root "/tmp/bunsen/scratch"
   :lifecycle-strategy :local})

(defn start []
  (alter-var-root #'*service*
                  (constantly
                    (component/start (service config)))))

(defn stop []
  (alter-var-root #'*service*
                  #(when % (component/stop %))))

(defn restart []
  (stop)
  (refresh :after 'user/start))

(defn watch []
  (start)
  (hawk/watch!
    [{:paths ["src"]
      :filter hawk/file?
      :handler (fn [_ {:keys [file]}]
                 (let [ns-sym (-> file read-file-ns-decl second)]
                   (require ns-sym :reload)
                   (println "reloaded namespace: " ns-sym)))}]))
