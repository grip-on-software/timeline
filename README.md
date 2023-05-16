# Timeline

This visualization produces a timeline of temporal data from a software 
development process. The data may include different types of events and 
regularly reoccurring cycles, such as Scrum sprints.

## Installation and running

You need to have installed `node` and `npm` to build the project, see 
[Node.js](https://nodejs.org/) for details. Within the directory of this 
project, use `npm install` to retrieve all dependencies. Then, either execute 
`npm run watch` to start a development server that also refreshes browsers upon 
code changes, or `npm run production` to create a minimized bundle. The 
resulting HTML, CSS and JavaScript is made available in the `public` directory.

In order to build the timeline web-based interface, you need a directory 
`public/data` containing a main file `public/data/data.json`, as well as other 
JSON files named after the event they describe and possibly split out into 
different project directories and Scrum sprints. See [the data format](#format) 
for more details.

Another option for installation and deployment is to use a Docker container 
image. Use `docker build -t gros-timeline .` to create the image with all 
dependencies. If the directory already contains a prepopulated `public/data` 
directory, then you can directly start a web server in the Docker container 
using `docker run -P --rm gros-timeline`. This opens a port on the localhost 
where you can connect to in order to find the timeline.

You may want to use Docker but still break up the installation, building 
(pre-publishing) and publishing steps. This can be done for example on 
a Jenkins server. In this case, at the end of the installation job which runs 
the `docker build` command, push the container image to a (private) repository. 
In the build job, provide the data in the workspace `public/data` directory, 
pull the image into the build job, and then run the container as follows:

```sh
docker pull gros-timeline
docker run --rm -u `id -u`:`id -g` -v `pwd`:/work -w /work gros-timeline \
  /bin/bash -ce 'rm -rf /work/node_modules; \
  ln -s /usr/src/app/node_modules/ /work; npm run production'
```

The `Jenkinsfile` contains further example steps for performing the data 
collection upon a Grip on Software database using the `data-analysis` 
repository (specifically, the `timeline.r` script and `sprint_burndown` 
analysis report), as well as the visualization building.

## Configuration

In order to configure the visualization, including options for setting the 
default language and the link to the sprint details, copy `lib/config.json` to 
`config.json` and alter its contents there. The following configuration items 
are known:

- `language`: The langugage code of the default language of the timeline.
- `jira_url`: The URL pointing to a Jira instance in order to link to sprints. 
  This is only used as a fallback in case the Jira instance is not defined in 
  the source data. If this is also empty, then no link to the Jira instance is 
  generated in the subchart title.
- `visualization_url`: The URL to the visualization hub. This may include 
  a protocol and domain name, but does not need to in case all the 
  visualizations and the leaderboard are hosted on the same domain (for example 
  in a development environment). The remainder is a path to the root of the 
  visualizations, where the dashboard is found and every other visualization 
  has sub-paths below it.
- `path`: The relative path at which the leaderboard is made available on the 
  server. This can remain the default `.` to work just fine.

## Features

- Interactive zoom and scroll to restrict the timeline view to certain ranges 
  or expand the view
- Different time scales: normal, weekday (mapping weekends to workdays)
- Responsive display, scales when resizing
- Dynamic type filter to simplify the timeline for only showing certain events. 
  Initial type filter is configurable in `data/types.json`.
- Subchart showing additional events during a specified range of a development 
  cycle, with chunked loading of data
- Fully translatable interface

## Format

In order to build the web interface, certain files are required during the 
build step. This section describes the format of these files.

- `public/data/data.json`: Contents are a JSON object with summary data. It 
  contains at least the following keys and values:
  - `min_date`: The earliest date from all other data sources
  - `max_date`: The latest date from all other data sources, may be later than 
    the current date
  - `update_date`: The date when the data was generated, used for cache 
    invalidation
  - `projects`: A list of project names that are used in the other data sources
- `public/data/[type].json`: Contents are a JSON object with project names as 
  keys and a list of event data as values. Each event object has the following 
  keys and values:
  - `project_name`: Same as the key of the overall object
  - `sprint_id`: Unique identifier of a range defined by a `sprint_start` event
  - `sprint_name`: Name of the range defined by a `sprint_start` event
  - `date`: The date and time that the event took place, in YYYY-MM-DDTHH:MM:SS
    format [1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.15)
  - `type`: Same as the type specified in the file name
  - `end_date` (Optional): The date and time that the event ends. For 
    `sprint_start` events, this is the end of the range defined by it.
  - `board_id` (Optional): The Jira board ID that the sprint comes from.
- `public/data/[project_name]/[type].[sprint_id].json`: Contents is a JSON list 
  with entries of the same format as the event objects used for other event 
  types. The events belong to a specific project name and occur during or 
  around a range defined by the `sprint_start` event with the `sprint_id` 
  identifier. Currently, this format is only used by the `commits` type.
- `public/data/features.json`: Contents is an object where keys are project 
  names, and values are objects with sprint identifiers as keys. For each 
  sprint, there is an object which has key-value pairs describing attributes of 
  that time range.
- `public/data/boards.json`: JSON object of project names as keys and Jira 
  board IDs as values. A board ID is either an integer or `null` to indicate 
  that no board is known. The board ID may then also come from feature data of 
  a sprint.
- `public/data/links.json`: JSON object of project names as keys and objects 
  with source links as values. The nested objects should have keys that end in 
  `_url`, but in particular the `jira_url` key is used to obtain the Jira 
  instance URL of the project.
- `public/data/types.json`: Registry of available types and their initial 
  filtering settings. Contents is a JSON list with object entries, each 
  containing at least a `name` whose value is the `type` used in the various 
  data files. For non-subchart types, `enabled` determines the initial filter 
  state. Subchart types are configured as such with a `subchart` key. Each type 
  may have a `locales` key with an object containing language codes as keys and 
  names as values, in order to localize the type name.
- `public/data/locales.json`: Contents is an object containing language codes 
  as keys, whose values are objects of feature keys and localized names.

## License

Timeline is released under the [MIT 
License](https://opensource.org/licenses/MIT). Some parts are based on 
[EventDrops](https://github.com/lhelwerd/EventDrops) (fork), also released 
under the MIT License.
