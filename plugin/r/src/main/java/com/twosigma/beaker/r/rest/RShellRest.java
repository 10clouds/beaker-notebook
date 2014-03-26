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
package com.twosigma.beaker.r.rest;

import java.io.File;
import java.io.InputStream;
import java.io.IOException;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.swing.ImageIcon;
import javax.ws.rs.FormParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.imageio.ImageIO;
import com.google.inject.Singleton;
import com.twosigma.beaker.jvm.object.SimpleEvaluationObject;
import com.twosigma.beaker.jvm.object.TableDisplay;
import com.twosigma.beaker.r.module.ROutputHandler;
import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.Rserve.RserveException;
import org.rosuda.REngine.REXPMismatchException;
import org.rosuda.REngine.REXP;
import org.rosuda.REngine.RList;

/**
 * Glue between the REST calls from the R plugin to the Rserve module that manages the R process.
 */
@Path("rsh")
@Produces(MediaType.APPLICATION_JSON)
@Singleton
public class RShellRest {

  private static final String BEGIN_MAGIC = "**beaker_begin_magic**";
  private static final String END_MAGIC = "**beaker_end_magic**";
  private final Map<String, RConnection> shells = new HashMap<>();
  private ROutputHandler rOutputHandler = null;
  private int svgUniqueCounter = 0;
  private int port = -1;

  public RShellRest() {
  }

  // set the port used for communication with the Rserve process
  public void setPort(int port) {
    this.port = port;
  }
  
  public void setOutput(InputStream stream) {
    this.rOutputHandler = new ROutputHandler(stream, BEGIN_MAGIC, END_MAGIC);
    this.rOutputHandler.start();
  }

  @POST
  @Path("getShell")
  public String getShell(
      @FormParam("shellid") String shellId) throws InterruptedException, RserveException {
    // if the shell doesnot already exist, create a new shell
    if (shellId.isEmpty() || !this.shells.containsKey(shellId)) {
      shellId = UUID.randomUUID().toString();
      newEvaluator(shellId);
      return shellId;
    }
    return shellId;
  }

  @POST
  @Path("evaluate")
  public SimpleEvaluationObject evaluate(
      @FormParam("shellID") String shellID,
      @FormParam("code") String code) throws InterruptedException, REXPMismatchException {

    boolean gotMismatch = false;
    // System.out.println("evaluating, shellID = " + shellID + ", code = " + code);
    SimpleEvaluationObject obj = new SimpleEvaluationObject(code);
    obj.started();
    RConnection con = getEvaluator(shellID);
    String dotDir = System.getProperty("user.home") + "/.beaker";
    String file = dotDir + "/rplot.svg";
    try {
      java.nio.file.Path p = java.nio.file.Paths.get(file);
      java.nio.file.Files.deleteIfExists(p);
    } catch (IOException e) {
      // ignore
    }

    try {
      // direct graphical output
      con.eval("svg('" + file + "')");
      String tryCode = "beaker_eval_=try({" + code + "\n},silent=TRUE)";
      REXP result = con.eval(tryCode);

      /*
       if (null != result)
       System.out.println("result class = " + result.getClass().getName());
       else
       System.out.println("result = null");
       */

      if (null == result) {
        obj.finished("");
      } else if (result.inherits("try-error")) {
        String prefix = "Error in try({ : ";
        String rs = result.asString();
        if (rs.substring(0, prefix.length()).equals(prefix)) {
          rs = rs.substring(prefix.length());
        }
        obj.error(rs);
      } else if (isDataFrame(result, obj)) {
        // nothing
      } else {
        this.rOutputHandler.reset(obj);
        con.eval("print(\"" + BEGIN_MAGIC + "\")");
        con.eval("print(beaker_eval_)");
        con.eval("print(\"" + END_MAGIC + "\")");
      }
    } catch (RserveException e) {
      obj.error(e.getMessage());
    } catch (REXPMismatchException e) {
      gotMismatch = true;
    }

    // flush graphical output
    try {
      con.eval("dev.off()");
    } catch (RserveException e) {
      obj.error("from dev.off(): " + e.getMessage());
    }

    // addPngResults(file, obj);
    addSvgResults(file, obj);

    return obj;
  }

  @POST
  @Path("autocomplete")
  public List<String> autocomplete(
          @FormParam("shellID") String shellID,
          @FormParam("code") String code,
          @FormParam("caretPosition") int caretPosition)
          throws InterruptedException {

    List<String> completionStrings = new ArrayList<>(0);
    //TODO
    return completionStrings;
  }

  private void newEvaluator(String id) {
    try {
      RConnection con = new RConnection("127.0.0.1", port);
      this.shells.put(id, con);
    } catch (RserveException e) {
      System.out.println("RserveException");
    }
  }

  private RConnection getEvaluator(String shellID) {
    if (shellID == null || shellID.isEmpty()) {
      shellID = "default";
    }
    return this.shells.get(shellID);
  }

  // R SVG has ids that need to be made globally unique.  Plus we
  // remove the xml version string, and any blank data attributes,
  // since these just cause errors on chrome's console.
  private String fixSvgResults(String xml) {
    String unique = "b" + Integer.toString(svgUniqueCounter++);
    xml = xml.replace("id=\"glyph", "id=\"" + unique + "glyph");
    xml = xml.replace("xlink:href=\"#glyph", "xlink:href=\"#" + unique + "glyph");
    xml = xml.replace("d=\"\"", "");
    xml = xml.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", "");
    return xml;
  }

  private boolean addSvgResults(String name, SimpleEvaluationObject obj) {
    File file = new File(name);
    if (file.length() > 0) {
      try (FileInputStream fis = new FileInputStream(file)) {
        byte[] data = new byte[(int) file.length()];
        fis.read(data);
        fis.close();
        String contents = new String(data, "UTF-8");
        obj.finished(fixSvgResults(contents));
        return true;
      } catch (FileNotFoundException e) {
        System.out.println("ERROR reading SVG results: " + e);
      } catch (IOException e) {
        System.out.println("IO error on " + name + " " + e);
      }
    }
    return false;
  }

  // should support multiple images? XXX
  private static boolean addPngResults(String name, SimpleEvaluationObject obj) {
    try {
      File file = new File(name);
      if (file.length() > 0) {
        obj.finished(new ImageIcon(ImageIO.read(file)));
        return true;
      }
    } catch (IOException e) {
      System.out.println("IO error on " + name + " " + e);
    }
    return false;
  }

  private static boolean isDataFrame(REXP result, SimpleEvaluationObject obj) {
    TableDisplay table;
    try {
      RList list = result.asList();
      int cols = list.size();
      String[] names = list.keys();
      if (null == names) {
        return false;
      }
      String[][] array = new String[cols][];
      List<List> values = new ArrayList<>();
      List<Class> classes = new ArrayList<>();

      for (int i = 0; i < cols; i++) {
        // XXX should identify numeric columns
        classes.add(String.class);
        array[i] = list.at(i).asStrings();
      }
      if (array.length < 1) {
        return false;
      }
      for (int j = 0; j < array[0].length; j++) {
        List<String> row = new ArrayList<>();
        for (int i = 0; i < cols; i++) {
          if (array[i].length != array[0].length) {
            return false;
          }
          row.add(array[i][j]);
        }
        values.add(row);
      }
      table = new TableDisplay(values, Arrays.asList(names), classes);
    } catch (REXPMismatchException e) {
      return false;
    }
    obj.finished(table);
    return true;
  }
}
