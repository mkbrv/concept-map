/**
 * Retrieves the data from the json
 */
function fetchData() {

    d3.json("data.json", function (error, data) {
        if (error) return console.warn(error);

        var aggregatedData = {};
        /// format: Each  publication has an array of endorsed presidents;
        data.forEach(function (d) {
            if (aggregatedData[d["publication"]]) {
                aggregatedData[d["publication"]]["endorsements"].push(d);
            } else {
                aggregatedData[d["publication"]] = {
                    "publication": d["publication"],
                    "endorsements": []
                };
            }
        });
        var dataArray = [];
        for (var element in aggregatedData) {
            if (aggregatedData.hasOwnProperty(element)) {
                dataArray.push(aggregatedData[element]);
            }
        }
        console.log(dataArray);
        buildChart(dataArray);
    });
}

/**
 * Builds the chart using data
 * @param data
 */
function buildChart(data) {


    var outer = d3.map();
    var inner = [];
    var links = [];

    var outerId = [0];

    data.forEach(function (d) {

        if (!d)
            return;

        i = {id: 'i' + inner.length, name: d["publication"], related_links: []};
        i.related_nodes = [i.id];
        inner.push(i);

        d["endorsements"].forEach(function (d1) {

            o = outer.get(d1["endorsed"]);

            if (!o) {
                o = {name: d1["endorsed"], party: d1["party"], id: 'o' + outerId[0], related_links: []};
                o.related_nodes = [o.id];
                outerId[0] = outerId[0] + 1;
                outer.set(d1["endorsed"], o);
            }

            // create the links
            l = {id: 'l-' + i.id + '-' + o.id, inner: i, outer: o}
            links.push(l);

            // and the relationships
            i.related_nodes.push(o.id);
            i.related_links.push(l.id);
            o.related_nodes.push(i.id);
            o.related_links.push(l.id);
        });
    });

    data = {
        inner: inner,
        outer: outer.values(),
        links: links
    }


    outer = data.outer;
    data.outer = Array(outer.length);


    var i1 = 0;
    var i2 = outer.length - 1;

    for (var i = 0; i < data.outer.length; ++i) {
        if (i % 2 == 1)
            data.outer[i2--] = outer[i];
        else
            data.outer[i1++] = outer[i];
    }

    console.log(data.outer.reduce(function (a, b) {
            return a + b.related_links.length;
        }, 0) / data.outer.length);


    var diameter = 960;
    var rect_width = 180;
    var rect_height = 15;

    var link_width = "1px";

    var il = data.inner.length;
    var ol = data.outer.length;

    var inner_y = d3.scale.linear()
        .domain([0, il])
        .range([-(il * rect_height) / 2, (il * rect_height) / 2]);

    mid = (data.outer.length / 2.0)
    var outer_x = d3.scale.linear()
        .domain([0, mid, mid, data.outer.length])
        .range([15, 170, 190, 355]);

    var outer_y = d3.scale.linear()
        .domain([0, data.outer.length])
        .range([0, diameter / 2 - 120]);


    // setup positioning
    data.outer = data.outer.map(function (d, i) {
        d.x = outer_x(i);
        d.y = diameter / 3;
        return d;
    });

    data.inner = data.inner.map(function (d, i) {
        d.x = -(rect_width / 2);
        d.y = inner_y(i);
        return d;
    });

    // Can't just use d3.svg.diagonal because one edge is in normal space, the
    // other edge is in radial space. Since we can't just ask d3 to do projection
    // of a single point, do it ourselves the same way d3 would do it.  


    function projectX(x) {
        return ((x - 90) / 180 * Math.PI) - (Math.PI / 2);
    }

    var diagonal = d3.svg.diagonal()
        .source(function (d) {
            return {
                "x": d.outer.y * Math.cos(projectX(d.outer.x)),
                "y": -d.outer.y * Math.sin(projectX(d.outer.x))
            };
        })
        .target(function (d) {
            return {
                "x": d.inner.y + rect_height / 2,
                "y": d.outer.x > 180 ? d.inner.x : d.inner.x + rect_width
            };
        })
        .projection(function (d) {
            return [d.y, d.x];
        });


    var svg = d3.select("body").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .append("g")
        .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


    function getColor(endorsed) {
        console.log(endorsed);
        if (endorsed.party === "Republican") {
            return "red";
        } else if (endorsed.party === "Democrat") {
            return "blue";
        }
        return "whitesmoke";
    }

    // links
    var link = svg.append('g').attr('class', 'links').selectAll(".link")
        .data(data.links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('id', function (d) {
            return d.id
        })
        .attr("d", diagonal)
        .attr('stroke', function (d) {
            return getColor(d.outer);
        })
        .attr('stroke-width', link_width);

    // outer nodes

    var onode = svg.append('g').selectAll(".outer_node")
        .data(data.outer)
        .enter().append("g")
        .attr("class", "outer_node")
        .attr("transform", function (d) {
            return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
        })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    onode.append("circle")
        .attr('id', function (d) {
            return d.id
        })
        .attr("r", 4.5);

    onode.append("circle")
        .attr('r', 20)
        .attr('visibility', 'hidden');

    onode.append("text")
        .attr('id', function (d) {
            return d.id + '-txt';
        })
        .attr("dy", ".31em")
        .attr("text-anchor", function (d) {
            return d.x < 180 ? "start" : "end";
        })
        .attr("transform", function (d) {
            return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)";
        })
        .text(function (d) {
            return d.name;
        });

    // inner nodes

    var inode = svg.append('g').selectAll(".inner_node")
        .data(data.inner)
        .enter().append("g")
        .attr("class", "inner_node")
        .attr("transform", function (d, i) {
            return "translate(" + d.x + "," + d.y + ")"
        })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    inode.append('rect')
        .attr('width', rect_width)
        .attr('height', rect_height)
        .attr('id', function (d) {
            return d.id;
        })
        .attr('fill', function (d) {
            return '#dddddd';
        });

    inode.append("text")
        .attr('id', function (d) {
            return d.id + '-txt';
        })
        .attr('text-anchor', 'middle')
        .attr("transform", "translate(" + rect_width / 2 + ", " + rect_height * .75 + ")")
        .text(function (d) {
            return d.name;
        });

    // need to specify x/y/etc

    d3.select(self.frameElement).style("height", diameter - 150 + "px");

    function mouseover(d) {
        // bring to front
        d3.selectAll('.links .link').sort(function (a, b) {
            return d.related_links.indexOf(a.id);
        });

        for (var i = 0; i < d.related_nodes.length; i++) {
            d3.select('#' + d.related_nodes[i]).classed('highlight', true);
            d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'bold');
        }

        for (var i = 0; i < d.related_links.length; i++)
            d3.select('#' + d.related_links[i]).attr('stroke-width', '5px');
    }

    function mouseout(d) {
        for (var i = 0; i < d.related_nodes.length; i++) {
            d3.select('#' + d.related_nodes[i]).classed('highlight', false);
            d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'normal');
        }

        for (var i = 0; i < d.related_links.length; i++)
            d3.select('#' + d.related_links[i]).attr('stroke-width', link_width);
    }

}

fetchData();