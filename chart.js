var Chart = function () {
    var diameter = 1000;
    var rect_width = 180;
    var rect_height = 15;

    var link_width = "1px";

    var publications = d3.map();
    var candidates = [];
    var links = [];
    var allPresidents = {};


    /**
     * Retrieves the data from the json and aggregates it.
     */
    this.fetchData = function () {
        var self = this;
        d3.json("data.json", function (error, data) {
            if (error) return console.warn(error);

            // Each Endorsed has an array of endorsements:  Endorsed: {Name,Endorsements[]}
            var aggregatedData = {};
            data.forEach(function (d) {
                if (aggregatedData[d["endorsed"]]) {
                    //if president already exists, push only the endorsement;
                    aggregatedData[d["endorsed"]]["endorsements"].push(d);
                } else {
                    //creating a new endorsed (candidate)
                    aggregatedData[d["endorsed"]] = {
                        "endorsed": d["endorsed"],
                        "party": d["party"],
                        "trivia": d["trivia"],
                        "potrait": d["portrait"],
                        "age": d["age"],
                        "homestate": d["homestate"],
                        "endorsements": []
                    };
                    //push the endorsement data into the array.
                    aggregatedData[d["endorsed"]]["endorsements"].push(d);
                }
            });
            /**
             * Transform the aggregated object in an array.
             * @type {Array}
             */
            var endorsedArray = [];
            for (var element in aggregatedData) {
                if (aggregatedData.hasOwnProperty(element)) {
                    endorsedArray.push(aggregatedData[element]);
                }
            }

            self.buildChart(endorsedArray);
        });
    };


    this.buildDataMap = function (endorsedArray) {
        var publicationsId = [0];
        endorsedArray.forEach(function (row) {

            if (!row) {
                return;
            }
            var candidateNode = {
                id: 'can' + candidates.length,
                name: row["endorsed"],
                related_links: []
            };
            candidateNode.related_nodes = [candidateNode.id];
            candidates.push(candidateNode);
            allPresidents[candidateNode.id] = row;


            row["endorsements"].forEach(function (publicationRow) {

                pubNode = publications.get(publicationRow["publication"]);

                if (!pubNode) {
                    pubNode = {
                        id: 'pub' + publicationsId[0],
                        name: publicationRow["publication"],
                        related_links: []
                    };
                    pubNode.related_nodes = [pubNode.id];
                    publicationsId[0] = publicationsId[0] + 1;
                    publications.set(publicationRow["publication"], pubNode);
                }

                // create the links
                var link = {
                    id: 'link-' + candidateNode.id + '-' + pubNode.id,
                    candidates: candidateNode,
                    publications: pubNode
                };
                links.push(link);

                // and the relationships
                candidateNode.related_nodes.push(pubNode.id);
                candidateNode.related_links.push(link.id);
                pubNode.related_nodes.push(candidateNode.id);
                pubNode.related_links.push(link.id);
            });
        });


        var data = {
            candidates: candidates,
            publications: publications.values(),
            links: links
        };


        publications = data.publications;
        data.publications = Array(publications.length);
        return data;
    };


    /**
     * Builds the chart using data
     * @param endorsedArray array of Endorsed
     */
    this.buildChart = function (endorsedArray) {
        var data = this.buildDataMap(endorsedArray);

        var i1 = 0;
        var i2 = publications.length - 1;

        for (var i = 0; i < data.publications.length; ++i) {
            if (i % 2 === 1)
                data.publications[i2--] = publications[i];
            else
                data.publications[i1++] = publications[i];
        }

        var candidates_y = d3.scale.linear()
            .domain([0, data.candidates.length])
            .range([-(data.candidates.length * rect_height) / 2, (data.candidates.length * rect_height) / 2]);

        mid = (data.publications.length / 2.0);
        var publications_x = d3.scale.linear()
            .domain([0, mid, mid, data.publications.length])
            .range([15, 170, 190, 355]);

        d3.scale.linear()
            .domain([0, data.publications.length])
            .range([0, diameter / 2 - 120]);

        data.publications = data.publications.map(function (d, i) {
            d.x = publications_x(i);
            d.y = diameter / 3;
            return d;
        });

        data.candidates = data.candidates.map(function (d, i) {
            d.x = -(rect_width / 2);
            d.y = candidates_y(i);
            return d;
        });

        /**
         * Find the outers ide  of the sphere.
         * @param x
         * @returns {number}
         */
        function outerside(x) {
            return ((x - 90) / 180 * Math.PI) - (Math.PI / 2);
        }

        var diagonal = d3.svg.diagonal()
            .source(function (d) {
                return {
                    "x": d.publications.y * Math.cos(outerside(d.publications.x)),
                    "y": -d.publications.y * Math.sin(outerside(d.publications.x))
                };
            })
            .target(function (d) {
                return {
                    "x": d.candidates.y + rect_height / 2,
                    "y": d.publications.x > 180 ? d.candidates.x : d.candidates.x + rect_width
                };
            })
            .projection(function (d) {
                return [d.y, d.x];
            });


        /**
         * The main SVG
         */
        var svg = d3.select("body").append("svg")
            .attr("width", diameter)
            .attr("height", diameter)
            .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


        // links between publications and candidates
        var link = svg.append('g').attr('class', 'links').selectAll(".link")
            .data(data.links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('id', function (d) {
                return d.id
            })
            .attr("d", diagonal)
            .attr('stroke', function (d) {
                return "whitesmoke";
            })
            .attr('stroke-width', link_width);

        // publications nodes on the outside
        var pubNode = svg.append('g').selectAll(".publications_node")
            .data(data.publications)
            .enter().append("g")
            .attr("class", "publications_node")
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            })
            .on("mouseover", this.mouseover)
            .on("mouseout", this.mouseout);

        pubNode.append("circle")
            .attr('id', function (d) {
                return d.id
            })
            .attr("r", 4.5);

        pubNode.append("circle")
            .attr('r', 20)
            .attr('visibility', 'hidden');

        pubNode.append("text")
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

        // candidates nodes
        var candidatesNode = svg.append('g').selectAll(".candidates_node")
            .data(data.candidates)
            .enter().append("g")
            .attr("class", "candidates_node")
            .attr("transform", function (d, i) {
                return "translate(" + d.x + "," + d.y + ")"
            })
            .on("mouseover", this.mouseover)
            .on("mouseout", this.mouseout);

        candidatesNode.append('rect')
            .attr('width', rect_width)
            .attr('height', rect_height)
            .attr('id', function (d) {
                return d.id;
            })
            .attr('fill', function (d) {
                return '#dddddd';
            });

        candidatesNode.append("text")
            .attr('id', function (d) {
                return d.id + '-txt';
            })
            .attr('text-anchor', 'middle')
            .attr("transform", "translate(" + rect_width / 2 + ", " + rect_height * .75 + ")")
            .text(function (d) {
                return d.name;
            });


        d3.select(self.frameElement).style("height", diameter - 150 + "px");

    };

    /**
     * Event when the mouse is over either the candidate node or the publication node
     * @param node
     */
    this.mouseover = function (node) {
        // bring to front
        d3.selectAll('.links .link').sort(function (a) {
            return node.related_links.indexOf(a.id);
        });


        for (var i = 0; i < node.related_nodes.length; i++) {
            d3.select('#' + node.related_nodes[i]).classed('highlight', true);
            d3.select('#' + node.related_nodes[i] + '-txt').attr("font-weight", 'bold');
        }

        for (var i = 0; i < node.related_links.length; i++) {
            d3.select('#' + node.related_links[i]).attr('stroke-width', '5px');


            var president = allPresidents[node.related_links[i].split("-")[1]];
            if (president) {
                if (president.party === "Republican") {
                    d3.select('#' + node.related_links[i]).attr('stroke', 'red');
                } else if (president.party === "Democrat") {
                    d3.select('#' + node.related_links[i]).attr('stroke', 'blue');
                } else if (president.party === "Independent") {
                    d3.select('#' + node.related_links[i]).attr('stroke', 'cyan');
                } else if (president.party === "None") {
                    d3.select('#' + node.related_links[i]).attr('stroke', 'yellow');
                }

                if (node.id.charAt(0) === 'c') {//candidates node
                    var age = president.age !== 0 ? president.age : "not elected";
                    var homestate = president.homestate != 0 ? ", " + president.homestate : "";
                    var trivia = president.trivia != 0 ? president.trivia : "";
                    d3.select("#president-details").html(
                        "<br/><img width='90' height='100' src='" + president.potrait + "'/>" +
                        "<hr/> " + president.endorsed + "" +
                        ", " + president.party + "<br/>" +
                        age + homestate + "</br></br>" + trivia);
                }
            }
        }
    };

    /**
     * Returns the map to the original state when mouse is not over the node;
     * @param node
     */
    this.mouseout = function (node) {
        for (var i = 0; i < node.related_nodes.length; i++) {
            d3.select('#' + node.related_nodes[i]).classed('highlight', false);
            d3.select('#' + node.related_nodes[i] + '-txt').attr("font-weight", 'normal');
        }

        for (var i = 0; i < node.related_links.length; i++) {
            d3.select('#' + node.related_links[i]).attr('stroke-width', link_width);
            d3.select('#' + node.related_links[i]).attr('stroke', "whitesmoke");
        }
    };

};

var chart = new Chart();
chart.fetchData();