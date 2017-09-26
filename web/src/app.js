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
      training: false,
      // is web worker ready?
      ready: false,
      datasetName: null,
      epochs: 5000,
      learningRate: 0.001,
      // dataset records
      dataset: [],
      errors: []
    };
  }

  componentDidMount() {
    // default dataset
    this.setDataset('4');

    this.renderErrors(true);

    this.renderNetwork();

    this.renderDataset();

    this.initWorker();
  }

  initWorker() {
    this.setState({
      ready: false
    });

    var worker = new Worker(`./loader.js`);
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

      this.updateDataset();
    });
  }

  getDataset(datasetPath) {
    return d3.csv(datasetPath).row(d => {
      d.X = +d.X;
      d.Y = +d.Y;
      d.Class = +d.Class;
      return d;
    });
  }

  dispatchMessage(data) {
    if (data.type === 'ready') this.setState({ ready: data.data });
    if (data.type === 'error') this.storeError(data);
    if (data.type === 'layers') this.updateNetwork(data.data);
    if (data.type === 'datasetEval') this.renderCanvas(data.data);
  }

  storeError(data) {
    this.setState({ errors: [...this.state.errors, data.data] });
    this.renderErrors(false);
  }

  train() {
    if (this.state.training) {
      alert("Cannot start two training sessions, yet!");
      return false;
    }

    if (!this.state.ready) {
      alert("Loading assets, please wait...");
      return false;
    }

    this.clearCanvas();

    this.clearNetwork();

    this.setState({
      errors: [],
      training: true,
    });

    this.worker.postMessage({
      "command":"train", 
      "datasetName": this.state.datasetName, 
      "learningRate": parseFloat(this.state.learningRate), 
      "epochs": parseInt(this.state.epochs, 10)
    });
  }

  stopTraining() {
    this.setState({
      training: false,
      ready: false
    });

    this.worker.terminate();
    this.initWorker();
  }

  getHeader() {
    if (this.state.errors.length) {
      return <p>Iterations {this.state.errors.length} <b>(Error: {this.state.errors.length > 0 && this.state.errors[this.state.errors.length - 1].toFixed(6)})</b></p>;
    } else if (this.state.ready) {
      return <p>Click on Train button to start.</p>;
    } else {
      return <p>Loading assets...</p>;
    }
  }

  updateState(e) {
    const obj = {};
    obj[e.target.id] = e.target.value;
    this.setState(obj);
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

                <canvas id="datasetEvaluate" width="450" height="300"></canvas>
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
                <p className={styles.datasetName}><b>{this.getDatasetDescription(this.state.datasetName)}</b></p>

                <form className={`${styles.noMargin} ${styles.trainForm}`}>
                  <div className={`${kui.row}`}>
                    <div className={`${kui.columns} ${kui.six}`}>
                      <label>Learning rate</label>
                      <input id="learningRate" className={`${styles.fullWidth}`} type="number" step="0.001" max="0.99" placeholder="Enter a number" value={this.state.learningRate} onChange={this.updateState.bind(this)} />
                    </div>
                    <div className={`${kui.columns} ${kui.six}`}>
                      <label>Epochs</label>
                      <input id="epochs" className={`${styles.fullWidth}`} type="number" min="1" max="100000" placeholder="Enter a number" value={this.state.epochs} onChange={this.updateState.bind(this)} />
                    </div>
                  </div>
                </form>

                {!this.state.training ?
                <button className={`${kui.button} ${this.state.ready ? kui.primary : ""}`} onClick={this.train.bind(this)} disabled={!this.state.ready}>
                  <i className={`fa ${this.state.ready ? "fa-play" : "fa-spin fa-spinner"}`} aria-hidden="true"></i>

                  {this.state.ready ? 
                  `Train (${this.state.dataset.length} records)`
                      :
                      `Loading...`
                  }
                </button>
                    :
                <button className={`${kui.button}`} onClick={this.stopTraining.bind(this)}>
                  <i className={`fa fa-stop`} aria-hidden="true"></i>
                  Stop training
                </button>
                }

                <svg className={styles.errors} id='errors'></svg>
              </div>
            </div>

            <div className={`${styles.networkContainer} ${kui.row}`}>
              <div className={`${kui.twelve} ${kui.columns}`}>

                <h3 className={styles.iterationHeader}>
                  {this.getHeader()}
                </h3>

                <svg className={`${styles.network} ${this.state.errors.length && 'active'}`} id='network'></svg>
              </div>
            </div>

            <div className={`${kui.row}`}>
              <div className={`${kui.twelve} ${kui.columns}`}>
                <h3>What is Juggernaut?</h3>
                <p>
                  Juggernaut is a Neural Network library.
                </p>

                <h3>Source code</h3>
                <p>
                  The source code of this page and Juggernaut is available on Github.
                </p>

                <h3>Creator</h3>
                <p>
                  Afshin Mehrabani, a software developer.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  renderErrors(initiate) {
    const outerHeight = 90;
    const outerWidth = 291;
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

  clearCanvas() {
    var canvas = document.querySelector("canvas#datasetEvaluate");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  renderCanvas(data) {
    var canvas = document.querySelector("canvas#datasetEvaluate");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var ctx = canvas.getContext("2d");
    var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    // That's how you define the value of a pixel //
    let i = 0;
    let j = 0;

    let rect = 15;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < data.length; ++y) {
      let [d, conf] = data[y][0];

      if (i * rect > canvasWidth) {
        ++j;
        i = 0;
      }

      if (d === 1) {
        ctx.fillStyle = 'rgba(44, 160, 44, ' + conf + ')';
      }

      if (d === 0) {
        ctx.fillStyle = 'rgba(255, 127, 14, ' + conf + ')';
      }

      if (d === 2) {
        ctx.fillStyle = 'rgba(31, 119, 180, '+ conf + ')';
      }

      ctx.fillRect(i * rect, j * rect, rect, rect);
      ++i;
    }
  }

  renderDataset() {
    const outerHeight = 300;
    const outerWidth = 450;
    const padding = 30;

    let main = d3.select('svg#dataset').attr('width', outerWidth).attr('height', outerHeight);
    main.append('g').attr("transform", `translate(${padding}, ${padding})`);
  }

  updateDataset() {
    const padding = 30;
    const outerHeight = 300;
    const outerWidth = 450;

    const x = 'X';
    const y = 'Y';

    const data = this.state.dataset;

    let dataG = d3.select('svg#dataset').select('g');
    let axisX = d3.scaleLinear().domain(d3.extent(data, (d) => d[x])).range([0, outerWidth - padding - padding]);
    let axisY = d3.scaleLinear().domain(d3.extent(data, (d) => d[y])).range([0, outerHeight - padding - padding]);
    var color = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.extent(data, (d) => d.Class));

    let circles = dataG.selectAll('circle').data(data).enter().append('circle').attr('r', 5).exit();

    dataG
      .selectAll('circle')
      .data(data)
      .transition()
      .delay(300)
      .duration(500)
      .style('stroke-width', "1")
      .style('stroke', "#fff")
      .attr('fill', (d) => color(d.Class))
      .attr('cy', (d) => axisY(d[y]))
      .attr('id', (d) => d.Class)
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
        return Math.min(flatWeights[i] * 5, 20);
      }).exit();
  }

  clearNetwork() {
    d3.select("#network")
      .selectAll("line.link")
      .style("stroke-width", 1)
      .exit();
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
