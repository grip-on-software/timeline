Timeline
========

An interactive visualization of temporal data from a software development 
process. The data may include different types of events and regularly 
reoccurring cycles, such as Scrum sprints.

## Installation

You need to have installed `node` and `npm` to build the project, see 
[Node.js](https://nodejs.org/) for details. Within the directory of this 
project, use `npm install` (or `make install`, which runs the same command) to 
retrieve all dependencies.

In order to build the timeline web-based interface, you need a directory `data` 
containing a main file `data/data.json`, as well as other JSON files named 
after the event they describe and possibly split out into different project 
directories and Scrum sprints. See [the data format](#Format) for more details.

Another option for installation and deployment is to use a Docker container 
image. Use `docker build -t ictu/gros-data-analysis .` to create the image with 
all dependencies. If the directory already contains a prepopulated `data` 
directory, then you can directly start a web server in the Docker container 
using `docker run -P --rm ictu/gros-timeline`. This opens a port on the 
localhost where you can connect to in order to find the timeline.

You may want to use Docker but still break up the installation, building 
(pre-publishing) and publishing steps. This can be done for example on 
a Jenkins server. In this case, at the end of the installation job which runs 
the `docker build` command, push the container image to a (private) repository. 
In the build job, provide the data in the workspace `data` directory, pull the 
image into the build job, and then run the container as follows:

```sh
docker pull ictu/gros-timeline
docker run --rm -u `id -u`:`id -g` -v `pwd`:/work -w /work ictu/gros-timeline 
/bin/bash -ce 'rm -rf /work/node_modules; ln -s /usr/src/app/node_modules/ 
/work; make build'
```

## Features

- Interactive zoom and scroll to restrict the timeline view to certain ranges 
  or expand the view
- Different time scales: normal, weekday (mapping weekends to workdays)
- Responsive display, scales when resizing
- Dynamic type filter to simplify the timeline for only showing certain events. 
  Initial type filter is configurable in `types.json`.
- Subchart showing additional events during a specified range of a development 
  cycle, with chunked loading of data
- Fully translatable interface

## Format

In order to build the web interface, certain files are required during the 
build step. This section describes the format of these files.

- `data/data.json`: Contents are a JSON object with summary data. It contains 
  at least the following keys and values:
  - `min_date`: The earliest date from all other data sources
  - `max_date`: The latest date from all other data sources, may be later than 
    the current date
  - `update_date`: The date when the data was generated, used for cache 
    invalidation
  - `projects`: A list of project names that are used in the other data sources
- `data/[type].json`: Contents are a JSON object with project names as keys and 
  a list of event data as values. Each event object has the following keys and 
  values:
  - `project_name`: Same as the key of the overall object
  - `sprint_id`: Unique identifier of a range defined by a `sprint_start` event
  - `sprint_name`: Name of the range defined by a `sprint_start` event
  - `date`: The date and time that the event took place, in YYYY-MM-DDTHH:MM:SS
    format [1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.15)
  - `type`: Same as the type specified in the file name
  - `end_date` (Optional): The date and time that the event ends. For 
    `sprint_start` events, this is the end of the range defined by it.
- `data/[project_name]/[type].[sprint_id].json`: Contents is a JSON list with 
  entries of the same format as the event objects used for other event types. 
  The events belong to a specific project name and occur during or around 
  a range defined by the `sprint_start` event with the `sprint_id` identifier. 
  Currently, this format is only used by the `commits` type.

## License

Timeline is released under the [MIT 
License](https://opensource.org/licenses/MIT). Some parts are based on 
[https://github.com/lhelwerd/EventDrops](EventDrops), also released under the 
MIT License.
