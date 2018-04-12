var fs = require('fs');
var colors = require('colors');
var datetime = require('node-datetime');
var request = require('request');

var path = __dirname.replace(/tools/g, '');

var ipAddresses = [];

fs.readFile(`${path}itrust-cluster-inventory`, 'utf8', function (err, data) {
    if (err) console.log('Failed to read file\n\n', err, '\n');
    else {
        var lines = data.split('\n');
        for (let i = 1; i < lines.length; i++) {
            ipAddresses.push(lines[i].split(' ')[0]);
        }

        setInterval(function () {

            var output = '';

            request({ url: `http://${ipAddresses[0]}:8080/iTrust2`, method: 'GET' }, function (error, response, body) {

                output += '\n------------------------\n';
                output += '------- ' + datetime.create().format('H:M:S').bold + ' -------\n';
                output += '------------------------\n'

                if (response && response.statusCode && response.statusCode === 200) {
                    output += `\n${ipAddresses[0]}:\t` + '   UP   '.bgGreen + '\n';
                }
                else {
                    output += `\n${ipAddresses[0]}:\t` + '  DOWN  '.bgRed + '\n';
                }

                request({ url: `http://${ipAddresses[1]}:8080/iTrust2`, method: 'GET' }, function (error, response, body) {
                    if (response && response.statusCode && response.statusCode === 200) {
                        output += `\n${ipAddresses[1]}:\t` + '   UP   '.bgGreen + '\n';
                    }
                    else {
                        output += `\n${ipAddresses[1]}:\t` + '  DOWN  '.bgRed + '\n';
                    }

                    request({ url: `http://${ipAddresses[2]}:8080/iTrust2`, method: 'GET' }, function (error, response, body) {
                        if (response && response.statusCode && response.statusCode === 200) {
                            output += `\n${ipAddresses[2]}:\t` + '   UP   '.bgGreen + '\n';
                        }
                        else {
                            output += `\n${ipAddresses[2]}:\t` + '  DOWN  '.bgRed + '\n';
                        }

                        request({ url: `http://${ipAddresses[3]}:8080/iTrust2`, method: 'GET' }, function (error, response, body) {
                            if (response && response.statusCode && response.statusCode === 200) {
                                output += `\n${ipAddresses[3]}:\t` + '   UP   '.bgGreen + '\n';
                            }
                            else {
                                output += `\n${ipAddresses[3]}:\t` + '  DOWN  '.bgRed + '\n';
                            }

                            request({ url: `http://${ipAddresses[4]}:8080/iTrust2`, method: 'GET' }, function (error, response, body) {
                                if (response && response.statusCode && response.statusCode === 200) {
                                    output += `\n${ipAddresses[4]}:\t` + '   UP   '.bgGreen;
                                }
                                else {
                                    output += `\n${ipAddresses[4]}:\t` + '  DOWN  '.bgRed;
                                }

                                console.log(output);
                            });
                        });
                    });
                });
            });
        }, 10000);
    }
});

