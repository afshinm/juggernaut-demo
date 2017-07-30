import React, { Component } from 'react';
import * as d3 from "d3";
import styles from "./css/main.css";
import kui from './css/kissui.css';

const DATASET_PATH = './dataset/iris.csv'

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dataset: [],
      x: 'petal_length',
      y: 'sepal_length',
      errors: []
    };
  }

  componentDidMount() {
    this.getDataset().get(dataset => {
      this.setState({dataset});
      this.renderDataset();
    });


    this.renderErrors();

    var worker = new Worker("./loader.js");
    this.worker = worker;

    worker.onmessage = (message) => this.dispatchMessage(JSON.parse(message.data));
  }

  getDataset(fn) {
    return d3.csv(DATASET_PATH).row(d => {
      d.sepal_length = +d.sepal_length;
      d.sepal_width = +d.sepal_width;
      d.petal_length = +d.petal_length;
      d.petal_width = +d.petal_width;
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
    this.worker.postMessage({"command":"train"});
  }

  render() {
    return (
      <div className={kui.container}>
        <div className={kui.row}>
          <div className={`${kui.column} ${kui.animated} ${kui.fadeIn}`} style={{marginTop: '10%'}}>
            <h2>Juggernaut</h2>
            <svg className={styles.dataset} id='dataset'></svg>
            <p>Dataset has {this.state.dataset.length} records.</p>


            <svg className={styles.errors} id='errors'></svg>
            <p>Error has {this.state.errors.length} records <b>({this.state.errors.length > 0 && this.state.errors[this.state.errors.length - 1].toFixed(6)})</b></p>

            <p>This page trains a model on your web browser using Emscripten and visualises all the steps and data points of the training process.
              It uses <a href="http://juggernaut.rs" target="_blank">Juggernaut</a> to train the model with Iris dataset and illustrates elements using <a href="http://d3js.org" target="_blank">D3</a>.
            </p>

            <a href="javascript:void(0);" className={kui.button} onClick={this.train.bind(this)}>Train</a>
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
    const outerWidth = 500;
    const padding = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30
    };

    const data = this.state.dataset;
    const x = this.state.x;
    const y = this.state.y;

    let main = d3.select('svg#dataset').attr('width', outerWidth).attr('height', outerHeight);
    let dataG = main.append('g').attr("transform", `translate(${padding.top}, ${padding.left})`);

    let axisX = d3.scaleLinear().domain(d3.extent(data, (d) => d[x])).range([0, outerWidth - padding.left - padding.right]);
    let axisY = d3.scaleLinear().domain(d3.extent(data, (d) => d[y])).range([0, outerHeight - padding.top - padding.bottom]);
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    let circles = dataG.selectAll('circle').data(data)
      .enter().append('circle').attr('r', 5).exit().remove();

    dataG.selectAll('circle')
      .transition()
      .delay(300)
      .duration(500)
      .attr('fill', (d) => color(d.class))
      .attr('cy', (d) => axisY(d[y]))
      .attr('cx', (d) => axisX(d[x]));
  }
}
