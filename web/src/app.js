import React, { Component } from 'react';
import * as d3 from "d3";
import styles from "./css/main.css";
import kui from './css/kissui.css';

import dataset1 from './images/dataset/1.png'
import dataset2 from './images/dataset/2.png'
import dataset3 from './images/dataset/3.png'

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      datasetName: null,
      dataset: [],
      errors: []
    };
  }

  componentDidMount() {
    // default dataset
    this.setDataset('4');

    this.renderErrors(true);

    this.renderNetwork();

    var worker = new Worker("./loader.js");
    this.worker = worker;

    worker.onmessage = (message) => this.dispatchMessage(JSON.parse(message.data));
  }

  getDatasetDescription(datasetName) {
    switch (datasetName) {
      case '4':
        return 'Multiclass, two informative features, one cluster'
      case '5':
        return 'Three blobs'
      case '6':
        return 'Gaussian divided into three quantiles'
      default:
        return 'Unknown'
    }
  }

  setDataset(datasetName) {
    this.getDataset(`./dataset/${datasetName}.csv`).get(dataset => {
      this.setState({
        dataset,
        datasetName
      });
      this.renderDataset();
    });
  }

  getDataset(datasetPath) {
    return d3.csv(datasetPath).row(d => {
      d.X = +d.X;
      d.Y = +d.Y;
      return d;
    });
  }

  dispatchMessage(data) {
    console.log("received the message!", data);

    if (data.type === 'error') this.storeError(data);
    if (data.type === 'layers') this.updateNetwork(data.data);
  }

  storeError(data) {
    this.setState({ errors: [...this.state.errors, data.data] });
    this.renderErrors(false);
  }

  train() {
    this.setState({errors: []});
    this.worker.postMessage({
      "command":"train", 
      "datasetName": this.state.datasetName, 
      "learningRate": 0.01, 
      "epochs": 1000
    });
  }

  render() {
    return (
      <div className={kui.container}>
        <div className={kui.row}>
          <div className={`${kui.column} ${kui.animated} ${kui.fadeIn}`} style={{marginTop: '10%'}}>
            <h2>Juggernaut</h2>

            <p>This page trains a model on your web browser using Emscripten and visualises all the steps and data points of the training process.
              It uses <a href="http://juggernaut.rs" target="_blank">Juggernaut</a> to train the model with Iris dataset and illustrates elements using <a href="http://d3js.org" target="_blank">D3</a>.
            </p>

            <div className={`${kui.row} ${styles.datasetWrapper}`}>
              <div className={`${kui.six} ${kui.columns}`}>
                <svg className={styles.dataset} id='dataset'></svg>
              </div>
              <div className={`${styles.datasetContainer} ${kui.two} ${kui.columns}`}>
                <a href="javascript:void(0);" className={`${kui.button} ${styles.datasetSelect} ${this.state.datasetName == '4' ? styles.active : null}`} onClick={this.setDataset.bind(this, '4')}>
                  <img src={dataset1} />
                </a>

                <a href="javascript:void(0);" className={`${kui.button} ${styles.datasetSelect} ${this.state.datasetName == '5' ? styles.active : null}`} onClick={this.setDataset.bind(this, '5')}>
                  <img src={dataset2} />
                </a>

                <a href="javascript:void(0);" className={`${kui.button} ${styles.datasetSelect} ${this.state.datasetName == '6' ? styles.active : null}`} onClick={this.setDataset.bind(this, '6')}>
                  <img src={dataset3} />
                </a>
              </div>

              <div className={`${kui.four} ${kui.columns}`}>
                <p><b>{this.getDatasetDescription(this.state.datasetName)}</b></p>
                <p>Dataset has {this.state.dataset.length} records.</p>

                <a href="javascript:void(0);" className={kui.button} onClick={this.train.bind(this)}>Train</a>

                <svg className={styles.errors} id='errors'></svg>
              </div>
            </div>

            <div className={`${styles.networkContainer} ${kui.row}`}>
              <div className={`${kui.twelve} ${kui.columns}`}>
                <svg className={styles.network} id='network'></svg>
              </div>
            </div>

            <div className={kui.row}>
              <div className={`${kui.six} ${kui.columns}`}>
                <p>Error has {this.state.errors.length} records <b>({this.state.errors.length > 0 && this.state.errors[this.state.errors.length - 1].toFixed(6)})</b></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderErrors(initiate) {
    const outerHeight = 120;
    const outerWidth = 270;
    const padding = 15;

    let main = d3.select('svg#errors');

    if (initiate) {
      main.attr('width', outerWidth).attr('height', outerHeight);
      var group = main.append('g').attr("transform", `translate(${padding}, ${padding})`);

      // empty line
      group.append("svg:path");
    } else {
      var group = main.select('g');
    }

    const data = this.state.errors;

    let axisX = d3.scaleLinear().domain([0, data.length]).range([0, outerWidth - padding - padding]);
    let axisY = d3.scaleLinear().domain(d3.extent(data).reverse()).range([0, outerHeight - padding - padding]);

    var line = d3.line()
      .x(function(d, i) { return axisX(i); }) // set the x values for the line generator
      .y(function(d) { return axisY(d); }) // set the y values for the line generator
      .curve(d3.curveMonotoneX) // apply smoothing to the line

    group.selectAll("path").data([data]).attr("d", line);
  }

  renderDataset() {
    const outerHeight = 300;
    const outerWidth = 450;
    const padding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30
    };

    const data = this.state.dataset;
    const x = 'X';
    const y = 'Y';

    d3.select('svg#dataset').selectAll('*').remove();

    let main = d3.select('svg#dataset').attr('width', outerWidth).attr('height', outerHeight);
    let dataG = main.append('g').attr("transform", `translate(${padding.top}, ${padding.left})`);

    let axisX = d3.scaleLinear().domain(d3.extent(data, (d) => d[x])).range([0, outerWidth - padding.left - padding.right]);
    let axisY = d3.scaleLinear().domain(d3.extent(data, (d) => d[y])).range([0, outerHeight - padding.top - padding.bottom]);
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    let circles = dataG.selectAll('circle').remove().data(data)
      .enter().append('circle').attr('r', 5).exit().remove();

    dataG.selectAll('circle')
      .transition()
      .delay(300)
      .duration(500)
      .attr('fill', (d) => color(d.Class))
      .attr('cy', (d) => axisY(d[y]))
      .attr('cx', (d) => axisX(d[x]));
  }


  flatten(d) {
    return d.reduce((a, b) => Array.isArray(b) ? a.concat(this.flatten(b)) : a.concat(b), []);
  }

  updateNetwork(weights) {
    var flatWeights = this.flatten(weights);
    var svg = d3.select("#network");

    var link = svg.selectAll(".link")
      .style("stroke-width", (d, i) => {
        return flatWeights[i] * 5;
      }).exit();
  }

  renderNetwork() {
    const width = 960;
    const height = 300;
    const nodeSize = 20;
    const graph = {
      "nodes": [
        {"label": "i0", "layer": 1},
        {"label": "i1", "layer": 1},

        {"label": "h0", "layer": 2},
        {"label": "h1", "layer": 2},
        {"label": "h2", "layer": 2},
        {"label": "h3", "layer": 2},

        {"label": "h0", "layer": 3},
        {"label": "h1", "layer": 3},
        {"label": "h2", "layer": 3},
        {"label": "h3", "layer": 3},

        {"label": "o0", "layer": 4},
        {"label": "o1", "layer": 4},
        {"label": "o2", "layer": 4},
      ]
    };

    const color = d3.scaleOrdinal(d3.schemeCategory20c);

    var svg = d3.select("#network")
      .attr("width", width)
      .attr("height", height);

    var nodes = graph.nodes;

    // get network size
    var netsize = {};

    nodes.forEach((d) => {
      if (d.layer in netsize) {
        netsize[d.layer] += 1;
      } else {
        netsize[d.layer] = 1;
      }
      d["lidx"] = netsize[d.layer];
    });

    // calc distances between nodes
    var largestLayerSize = Math.max.apply(null, Object.keys(netsize).map(i => netsize[i]));

    var xdist = width / Object.keys(netsize).length;
    var ydist = height / largestLayerSize;

    // create node locations
    nodes.map((d, i) => {
      d["x"] = (d.layer - 0.5) * xdist;
      d["y"] = (d.lidx - 0.5) * (height / (netsize[d.layer]));
    });

    // autogenerate links
    var links = [];
    nodes.map((d, i) => {
      for (var n in nodes) {
        if (d.layer + 1 == nodes[n].layer) {
          links.push({"source": parseInt(i), "target": parseInt(n), "value": 1}) }
      }
    }).filter((d) => typeof d !== "undefined");

    // draw links
    var link = svg.selectAll(".link")
      .data(links)
      .enter().append("line")

      .attr("class", "link")
      .attr("x1", (d) => nodes[d.source].x)
      .attr("y1", (d) => nodes[d.source].y)
      .attr("x2", (d) => nodes[d.target].x)
      .attr("y2", (d) => nodes[d.target].y)
      .style("stroke-width", (d) => Math.sqrt(d.value));

    // draw nodes
    var node = svg.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");

    var circle = node.append("circle")
      .attr("class", "node")
      .attr("r", nodeSize)
      .style("fill", (d) => color(d.layer));


    node.append("text")
      .attr("dx", "-.35em")
      .attr("dy", ".35em")
      .text((d) => d.label);
  }
}
