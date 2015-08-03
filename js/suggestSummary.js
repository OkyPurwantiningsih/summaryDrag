var sections = [], distances = [], max;
var threshold = 1; // if distance is below 4, then merge

function suggestSummary(){
	sections.length = 0;
	defineStackFunction();
	defineAreaFunction();
	
	// ====== 1. Divide the area into n different section
	minX = d3.min(data, function(d) {return parseInt(d.x);}); // parseInt() round float to the smaller int
	maxX = d3.max(data, function(d) {return parseInt(d.x);});

	var n = ((maxX+1)-(minX-1));
	sectionSize = width/n;

	// ====== 2. Define the profile of each section
	var neg, net, pos;
	listOfSession = d3.set(data.map(function(d){return d.sessionName;})).values();
	sectionName = 1;
	for(var i=(minX-1); i<(maxX+1); i++){
	//for(var i=-20; i<-18; i++){
		
		processSectionData(i,i+1);
	
		line = new Line({x:i+1, text:round(i+1,2), linePos: sectionName});
		sections.push(new Section(
		{	sectionName: sectionName,
			lowerBound: i,
			upperBound: i+1,
			sectionLine: line,
			slices: slices,
			normalizedSlices: normalizedSlices,
			stackData: stackData,
			max: max
		}));
		
		sectionName++;
	}
	
	//console.log(sections);
	
	// ====== 4. calculate distance between consecutive slices
	calculateDistance(sections);
	
	// ====== 5. Hierarchical Clustering
	merging = true;
	updatedSection = [];
	while(merging){
		
		// check if there is distance which fall below the threshold
		// if the distance is below the threshold, merge the section
		count = 0;
		for(var i=0; i<distances.length; i++){
			if(distances[i]<threshold){
				console.log("merge section "+ (i+1) +" and "+ (i+2));
				
				processSectionData(sections[i].lowerBound,sections[i+1].upperBound);
				line = new Line({x:sections[i+1].upperBound, text:round(sections[i+1].upperBound,2), linePos: i+1});
				sectionName = i+1;
				
				// get the left side of the merged sections
				updatedSection = sections.slice(0,i);
				
				// add the merged section
				updatedSection.push(new Section(
				{	sectionName: sectionName,
					lowerBound: sections[i].lowerBound,
					upperBound: sections[i+1].upperBound,
					sectionLine: line,
					slices: slices,
					normalizedSlices: normalizedSlices,
					stackData: stackData,
					max: max
				}));
				
				// add the right side of the merged sections if it is not the most right
				if((i+1) < (sections.length-1)){
					sections.slice(i+2).forEach(function(d){
						updatedSection.push(d);
					});
				}
							
				// update the data of the right side merged sections
				for(var j=(i+1); j<updatedSection.length; j++){
					sectionName++;
					updatedSection[j].sectionName = sectionName;
					line = new Line({x:updatedSection[j].upperBound, text:round(updatedSection[j].upperBound,2), linePos: sectionName});
					updatedSection[j].sectionLine = line;
				}
				
				// update distance array
				distances.splice(i,1);
				
				sections = updatedSection;
				console.log(sections.length);
				--i;
				count++;
			}
		}
		
		// if all of the distance is over the threshold, exit from the loop
		if(count===0){
			break;
		}
		// recalculate distances
		calculateDistance(sections);

		

	}
	
	
	// Visualize
	draw();
}

function processSectionData(inputLeft,inputRight){
	dataPerSection = data.filter(function(d){ return ((d.x > inputLeft) && (d.x <= inputRight))});
		
	slices = [];
	listPos = [], listNet = [], listNeg = [], dataCombined = [], stackData = [];
	slices.length = 0;
	max = 0;
	for(var j=0; j<listOfSession.length; j++){
		dataPerSession = dataPerSection.filter(function(d) { return d.sessionName == listOfSession[j];});
		//console.log(dataPerSession.filter(isNeutral));
		
		neg = dataPerSession.filter(isNegative).length;
		net = dataPerSession.filter(isNeutral).length;
		pos = dataPerSession.filter(isPositive).length;
		listPos.push(new Dt({sessionName:listOfSession[j],noOfEvent:pos,eventCat:"Positive"}));
		listNet.push(new Dt({sessionName:listOfSession[j],noOfEvent:net,eventCat:"Neutral"}));
		listNeg.push(new Dt({sessionName:listOfSession[j],noOfEvent:neg,eventCat:"Negative"}));
		
		// calculate max value for all session in the same section
		max = d3.max([max,d3.max([pos, d3.max([neg, net])])]);
		slices.push(new Slice({	
					neg: neg,
					net: net,
					pos: pos				
				}));
		
	}
	
	dataCombined = [{type:eventType[0], dataArr: listNeg, color:trColor[0]},
					{type:eventType[1], dataArr: listNet, color:trColor[1]},
					{type:eventType[2], dataArr: listPos, color:trColor[2]}];
	
	stackData = stack(dataCombined);
	
	// ====== 3. calculate normalized value for each slice by dividing it with max value	
	normalizedSlices = [];
	for(var j=0; j<slices.length; j++){
		normalizedSlices.push(new Slice({
			neg:(slices[j].neg/max),
			net:(slices[j].net/max),
			pos:(slices[j].pos/max)
		}));
	}
}

function calculateDistance(input){
	d=0;
	distances.length = 0;
	for(var i=0; i<input.length-1; i++){
		d = 0;
		for(var j=0; j<input[i].normalizedSlices.length; j++){
			s1 = input[i].normalizedSlices[j];
			s2 = input[i+1].normalizedSlices[j];
			d = d + Math.sqrt(Math.pow((s2.neg-s1.neg),2)+Math.pow((s2.net-s1.net),2)+Math.pow((s2.pos-s1.pos),2));
		}
		
		distances.push(d);
	}
	
	console.log(distances);
}

function draw(){
	initYAxis();
	initXAxis3();
	appendCanvas();
	
	// draw axis
	drawAxis();
	
	// draw graph
	drawThemeRiverGraph(sections);
	
	// draw line
	sectionLineList = sections.map(function (d) { return d.sectionLine; });
	drawSectionLine(sectionLineList);
	
}

function drawSectionLine(input){
	// Add a group element for each section.
	g = svg.selectAll(".section")
		  .data(input)
		.enter().append("svg:g")
		  .attr("class", function(d) { return "section"+ d.linePos; })
		  .attr("transform", function(d) { return "translate(" + x(d.x) + ")"; });
		  //.call(drag)
	
	// Add section line and title.
	g.append("svg:g")
		  .attr("class", "axis")
		  .each(function(d) { d3.select(this).call(axis) })
		.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(function(d) {return d.text;});
}

function drawThemeRiverGraph(input){
	for(var i = 0; i < input.length; i++){
		container = svg.append("g")
					   .attr('class','chart'+input[i].sectionName);
			   
		container.selectAll("path")
			.data(input[i].stackData)
			.enter().append("path")
			.attr("d", function(d) { return area(d.dataArr); })
			.style("fill", function(d) { return d.color; })
			.append("title")
			.text(function(d) { return d.type; });
		
		maxYAfterStacked = getMaxY2(input[i].stackData);
		sectionSize = x(input[i].upperBound) - x(input[i].lowerBound);
		svg.selectAll('.chart'+input[i].sectionName).attr("transform", function(d){ return "translate("+ (((sectionSize/2)-tr_x(maxYAfterStacked/2))+x(input[i].lowerBound)) + "," + 0 + ")"; });
				
	}
}

function initXAxis3(){
	
	x = d3.scale.linear().range([0, width]).domain([minX-1, maxX+1]);
	x2 = d3.scale.linear().range([minX-1,maxX+1]).domain([0,width]);

	trmaxX = getMaxYAllSection();

	tr_x = d3.scale.linear()
				.range([0, sectionSize])
				.domain([0, trmaxX]);
	
	xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(0);

}

function Section(input){
	this.sectionName = input.sectionName;
	this.lowerBound = input.lowerBound;
	this.upperBound = input.upperBound;
	this.sectionLine = input.sectionLine;
	this.slices = input.slices;
	this.normalizedSlices = input.normalizedSlices;
	this.stackData = input.stackData;
	this.max = input.max;
}

function Slice(input){
	this.neg = input.neg;
	this.net = input.net;
	this.pos = input.pos;
}

function Dt(input){
	this.sessionName = input.sessionName;
	this.noOfEvent = input.noOfEvent;
	this.eventCat = input.eventCat;
}

function Line(input){
	this.x = input.x;
	this.text = input.text; 
	this.linePos = input.linePos;
}

function getMinYAllSection(){
	// Calculate min y value for all area 
	var minYValue = 0;
	for(var j = 0; j < sections.length; j++){
		for(var i = 0; i < sections[j].stackData.length; i++){
			if( minYValue > d3.min(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; })){
				minYValue = d3.min(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; });
			}
		}
	}
	
	return minYValue;
}

function getMaxYAllSection(){
	// Calculate max y value for all area
	var maxYValue = 0;
	for(var j = 1; j < sections.length; j++){
		for(var i = 0; i < sections[j].stackData.length; i++){
			if( maxYValue < d3.max(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; })){
				maxYValue = d3.max(sections[j].stackData[i].dataArr, function(d) { return d.y + d.y0; });
			}
		}
	}
	
	return maxYValue;
}