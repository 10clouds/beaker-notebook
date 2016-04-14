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
package com.twosigma.beaker.core.module;

import com.google.inject.AbstractModule;
import com.google.inject.Injector;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.google.inject.servlet.GuiceFilter;
import com.google.inject.servlet.GuiceServletContextListener;
import com.twosigma.beaker.core.module.config.BeakerConfig;
import com.twosigma.beaker.shared.module.config.WebServerConfig;
import com.twosigma.beaker.shared.rest.filter.OwnerFilter;
import com.twosigma.beaker.shared.servlet.BeakerProxyServlet;
import org.apache.commons.lang3.StringUtils;
import org.eclipse.jetty.http.HttpVersion;
import org.eclipse.jetty.security.ConstraintMapping;
import org.eclipse.jetty.security.ConstraintSecurityHandler;
import org.eclipse.jetty.security.HashLoginService;
import org.eclipse.jetty.security.SecurityHandler;
import org.eclipse.jetty.security.authentication.BasicAuthenticator;
import org.eclipse.jetty.server.*;
import org.eclipse.jetty.server.handler.ErrorHandler;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ErrorPageErrorHandler;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.security.Constraint;
import org.eclipse.jetty.util.security.Credential;
import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.eclipse.jetty.websocket.jsr356.server.deploy.WebSocketServerContainerInitializer;

import javax.servlet.ServletException;

import static org.apache.commons.lang3.StringUtils.isNoneBlank;

/**
 * The WebServer Module that sets up the server singleton to be started in Init
 */
public class WebServerModule extends AbstractModule {

  @Override
  protected void configure() {
    bind(OwnerFilter.class);
  }

  private SecurityHandler makeSecurityHandler(String password) {
    Constraint constraint = new Constraint(Constraint.__BASIC_AUTH, "user");
    constraint.setAuthenticate(true);
    constraint.setRoles(new String[]{"user"});
    Constraint wsConstraint = new Constraint(Constraint.ANY_AUTH, "ws");
    wsConstraint.setAuthenticate(false);
    wsConstraint.setRoles(new String[]{});
    ConstraintMapping cm = new ConstraintMapping();
    cm.setConstraint(constraint);
    cm.setPathSpec("/*");
    ConstraintMapping wsConstraintMapping = new ConstraintMapping();
    wsConstraintMapping.setConstraint(wsConstraint);
    wsConstraintMapping.setPathSpec("/cometd/");
    ConstraintSecurityHandler csh = new ConstraintSecurityHandler();
    csh.setAuthenticator(new BasicAuthenticator());
    csh.setRealmName("SecureRealm");
    csh.addConstraintMapping(cm);
    csh.addConstraintMapping(wsConstraintMapping);
    HashLoginService loginService = new HashLoginService();
    loginService.putUser("beaker", Credential.getCredential(password),
                         new String[]{"user"});
    csh.setLoginService(loginService);
    return csh;
  }

  public static void startProxyServer(final Injector injector) throws Exception {
    WebServerConfig webServerConfig = injector.getInstance(WebServerConfig.class);
    BeakerConfig bkConfig = injector.getInstance(BeakerConfig.class);

    Server server = new Server();
    ServerConnector connector;
    boolean useSSL = bkConfig.getPublicServer() || (isNoneBlank(bkConfig.getUseHttpsCert()) && isNoneBlank(bkConfig.getUseHttpsKey()));
    String host = bkConfig.getPublicServer() ? "0.0.0.0" : "127.0.0.1";
    int proxyPort = bkConfig.getPublicServer() ? bkConfig.getPortBase() : bkConfig.getPortBase() + 1;
    if (useSSL) {
      HttpConfiguration https = new HttpConfiguration();
      https.addCustomizer(new SecureRequestCustomizer());
      SslContextFactory sslContextFactory = new SslContextFactory();
      sslContextFactory.setKeyStorePath("~/keystore.jks");//todo certs and passwords
      sslContextFactory.setKeyStorePassword("123456");//todo password here
      sslContextFactory.setKeyManagerPassword("123456");//todo password here
      connector = new ServerConnector(server,
          new SslConnectionFactory(sslContextFactory, "http/1.1"),
          new HttpConnectionFactory(https));
      connector.setPort(proxyPort);
      connector.setHost(host);
    } else {
      connector = new ServerConnector(server);
      connector.setPort(proxyPort);
      connector.setHost(host);
    }


    server.setConnectors(new Connector[] { connector });
    ServletContextHandler servletHandler = new ServletContextHandler(server, "/");

    String hash = bkConfig.getHash();
    ServletHolder sh = servletHandler.addServlet(BeakerProxyServlet.class, "/*");
    sh.setInitParameter("proxyTo", "http://127.0.0.1:" + webServerConfig.getPort());
    sh.setInitParameter("hash", hash);
    sh.setInitParameter("corePort", String.valueOf(webServerConfig.getPort()));
    sh.setInitParameter("proxyPort", String.valueOf(connector.getPort()));
    sh.setInitParameter("publicServer", String.valueOf(bkConfig.getPublicServer()));
    sh.setInitParameter("requirePassword", String.valueOf(bkConfig.getRequirePassword()));
    sh.setInitParameter("authCookie", bkConfig.getAuthCookie());
    sh.setInitParameter("corePassword", webServerConfig.getPassword());
    sh.setInitParameter("authToken", bkConfig.getAuthToken());

    servletHandler.setInitParameter("maxCacheSize", "0");
    servletHandler.setInitParameter("cacheControl", "no-cache, max-age=0");

    server.setHandler(servletHandler);

    server.start();
    WebSocketServerContainerInitializer.configureContext(servletHandler);
  }

  @Provides
  @Singleton
  public Server getServer(final Injector injector) throws Exception {
    WebServerConfig webServerConfig = injector.getInstance(WebServerConfig.class);
    String staticDir = webServerConfig.getStaticDirectory();
    Server server = new Server();
    final ServerConnector conn = new ServerConnector(server);
    conn.setPort(webServerConfig.getPort());
    conn.setHost("127.0.0.1");
    server.setConnectors(new Connector[] { conn });
    ServletContextHandler servletHandler = new ServletContextHandler(server, "/");
    servletHandler.addEventListener(new GuiceServletContextListener() {
      @Override
      protected Injector getInjector() {
        return injector;
      }
    });
    server.addBean(createErrorHandler());

    servletHandler.setSecurityHandler(makeSecurityHandler(webServerConfig.getPassword()));
    servletHandler.addFilter(GuiceFilter.class, "/*", null);

    servletHandler.addServlet(DefaultServlet.class, "/*");

    servletHandler.setInitParameter("org.eclipse.jetty.servlet.Default.resourceBase", staticDir);
    servletHandler.setInitParameter("org.eclipse.jetty.servlet.Default.dirAllowed", "false");
    servletHandler.setInitParameter("maxCacheSize", "0");
    servletHandler.setInitParameter("cacheControl", "no-cache, max-age=0");

    server.setHandler(servletHandler);

    try {
      startProxyServer(injector);
    } catch (ServletException e) {
      e.printStackTrace();
    }

    WebSocketServerContainerInitializer.configureContext(servletHandler);
    return server;
  }

  private ErrorPageErrorHandler createErrorHandler() {
    final ErrorPageErrorHandler errorHandler = new ErrorPageErrorHandler();
    errorHandler.addErrorPage(500, 599, "/static/50x.html");
    return errorHandler;
  }
}
