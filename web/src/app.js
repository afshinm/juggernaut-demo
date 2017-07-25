import React, { Component } from 'react';
import * as d3 from "d3";
import styles from "./css/main.css";
import kui from './css/kissui.css';

const DATASET_PATH = './dataset/iris.csv'
const outerHeight = 300;
const outerWidth = 500;
const padding = {
  top: 30,
  right: 30,
  bottom: 30,
  left: 30
};

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dataset: [],
      x: 'petal_length',
      y: 'sepal_length'
    };
  }

  componentDidMount() {
    this.getData().get(dataset => {
      this.setState({dataset});
    });
  }

  render() {
    if (this.state.dataset) this.renderSvg();

    return (
      <div className={kui.container}>
        <div className={kui.row}>
          <div className={`${kui.column} ${kui.animated} ${kui.fadeIn}`} style={{marginTop: '10%'}}>
            <h2>Juggernaut</h2>
            <svg className={styles.dataset} id='dataset'></svg>
            <p>Dataset has {this.state.dataset.length} records.</p>

            <p>This page trains a model on your web browser using Emscripten and visualises all the steps and data points of the training process.
              It uses <a href="http://juggernaut.rs" target="_blank">Juggernaut</a> to train the model with Iris dataset and illustrates elements using <a href="http://d3js.org" target="_blank">D3</a>.
            </p>

            <a href="#" className={kui.button}>Train</a>
          </div>
        </div>
      </div>
    );
  }

  renderSvg() {
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

  getData(fn) {
    return d3.csv(DATASET_PATH).row(d => {
      d.sepal_length = +d.sepal_length;
      d.sepal_width = +d.sepal_width;
      d.petal_length = +d.petal_length;
      d.petal_width = +d.petal_width;
      return d;
    });
  }
}
