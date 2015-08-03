var sliderValue, sectionSize;
var m = [30, 10, 10, 10],
	w = 960 - m[1] - m[3],
	h = 500 - m[0] - m[2];
var minXValue, maxXValue, xRange, sectionLineX=[];
var x,y, dragging, line, axis, svg, listOfSession;

$(document).ready(function (){
	generateContainer();
})

function generateContainer(){

	x = d3.scale.linear().range(0,w),
		y = {},
		dragging = {};

	line = d3.svg.line(),
		axis = d3.svg.axis().orient("left");

	svg = d3.select("#chartContainer").append("svg:svg")
		.attr("width", w + m[1] + m[3])
		.attr("height", h + m[0] + m[2])
	  .append("svg:g")
		.attr("transform", "translate(" + m[3] + "," + m[0] + ")");
				
	d3.select('#slider')
	  .call(d3.slider()
				.axis(d3.svg.axis().ticks(6))
				.min(0)
				.max(30)
				.on("slide", function(evt, value) {
						sliderValue = Math.round(value);
						d3.select('#slider3text').text(sliderValue);
						
						drawGraph();
					}));
}

function drawGraph(){
	d3.json("data/test2.json", function(error, dataAll) {
		if(error){
			console.log(error);
			alert("Data can't be loaded");
		}else{
			
			data = dataAll;
			//Define line to separate sections
			defineSectionLine();
			
			listOfSession = d3.set(data.map(function(d){return d.sessionName;})).values();
			
			//Define section
			x.domain(sectionLine = sectionLineX.map(function(d){return d.text && (y[d] = d3.scale.ordinal()
			.domain(d3.extent(listOfSession))
			.range([h, 0]));}));
			
			
			// Add a group element for each section.
			  var g = svg.selectAll(".section")
				  .data(sectionLine)
				.enter().append("svg:g")
				  .attr("class", "section")
				  .attr("transform", function(d) { return "translate(" + x(d) + ")"; });
				  //.call(drag);
			
			  // Add an axis and title.
			  g.append("svg:g")
				  .attr("class", "axis")
				  .each(function(d) { d3.select(this).call(axis); })
				.append("svg:text")
				  .attr("text-anchor", "middle")
				  .attr("y", -9)
				  .text(String);
		}
				
	});
}

function defineSectionLine(){
	// Calculate sectionSize based on the number of section (sliderValue)
	sectionSize = w/sliderValue;
	
	// Calculate x range for each section
	minXValue = d3.min(data, function(d) {return parseFloat(d.x);});
	maxXValue = d3.max(data, function(d) {return parseFloat(d.x);});
	xRange = (maxXValue - minXValue) / sliderValue;
	
	// Put the line of each section in an array
	sectionLineX.length = 0;
	sectionLineX.push({x:minXValue, text:round(minXValue,2)});
	for(var i=1; i<=sliderValue; i++){
		xline = sectionLineX[i-1].x+xRange;
		sectionLineX.push({x:xline, text: round(xline,2)});
	}

}

// Function to round number to the nearest integer
function round(value, exp) {
	if (typeof exp === 'undefined' || +exp === 0)
		return Math.round(value);

	value = +value;
	exp  = +exp;

	if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
		return NaN;

	// Shift
	value = value.toString().split('e');
	value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

	// Shift back
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}