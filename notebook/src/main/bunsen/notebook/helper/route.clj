(ns bunsen.notebook.helper.route
  (:require [bidi.bidi :as bidi]))

(defn- walk-matched [f routes]
  (let [leaf? (or (map? routes)
                  (vector? routes))]
    (if leaf?
      (into (empty routes)
            (map (fn [[pattern matched]]
                   [pattern (walk-matched f matched)])
                 routes))
      (f routes))))

(defn walk [f [pattern matched]]
  [pattern (walk-matched f matched)])

(defn make-handler [f routes]
  (bidi/make-handler (walk f routes)))

(defn with-default [default & routes]
  ["" [["" (vec
             (apply
               concat (map vec routes)))]
       [#".*" default]]])
