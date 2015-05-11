Beaker Publications
===========================
###Description
A web API server for sharing and publishing Beaker notebooks.


###Requirements

- Java
- Leiningen (>= 2.4.x)
- Docker
- Mesos
- Marathon

###Running

To run outside of a docker container, `lein run` will start the server on the default port (3003). To start from the `lein repl` in development, run:

	(user/start)
	;; starts the service

Also in development, the service can be restarted or stopped from the `repl`:

	(user/restart)
	;; restarts the service, reloads modified namespaces
	(user/stop)
	;; stops the service

###Building

All commands should be run in the service directory. To create the uberjar, first run:

	lein build
