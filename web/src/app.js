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

    this.renderErrors();

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
  }

  storeError(data) {
    this.setState({ errors: [...this.state.errors, data.data] });
    this.updateErrors();
  }

  train() {
    this.setState({errors: []});
    this.worker.postMessage({
      "command":"train", 
      "datasetName": this.state.datasetName, 
      "learningRate": 0.01, 
      "epochs": 2100
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

            <div className={kui.row}>
              <div className={`${kui.six} ${kui.columns}`}>
                <svg className={styles.dataset} id='dataset'></svg>
              </div>
              <div className={`${kui.two} ${kui.columns}`}>
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
              </div>
            </div>
            

            <div className={kui.row}>
              <div className={`${kui.six} ${kui.columns}`}>

            <svg className={styles.errors} id='errors'></svg>
            <p>Error has {this.state.errors.length} records <b>({this.state.errors.length > 0 && this.state.errors[this.state.errors.length - 1].toFixed(6)})</b></p>

            <a href="javascript:void(0);" className={kui.button} onClick={this.train.bind(this)}>Train</a>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderErrors() {
    const outerHeight = 300;
    const outerWidth = 500;
    const padding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30
    };

    let main = d3.select('svg#errors').attr('width', outerWidth).attr('height', outerHeight);
    let dataG = main.append('g').attr("transform", `translate(${padding.top}, ${padding.left})`);

    this.errorsChart = dataG;

    dataG.append("svg:path");
  }

  updateErrors() {
    const outerHeight = 300;
    const outerWidth = 500;
    const padding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30
    };

    const data = this.state.errors;

    let axisX = d3.scaleLinear().domain([0, data.length]).range([0, outerWidth - padding.left - padding.right]);
    let axisY = d3.scaleLinear().domain(d3.extent(data).reverse()).range([0, outerHeight - padding.top - padding.bottom]);

    var line = d3.line()
      .x(function(d, i) { return axisX(i); }) // set the x values for the line generator
      .y(function(d) { return axisY(d); }) // set the y values for the line generator
      .curve(d3.curveMonotoneX) // apply smoothing to the line

    this.errorsChart.selectAll("path").data([data]).attr("d", line);
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
}
