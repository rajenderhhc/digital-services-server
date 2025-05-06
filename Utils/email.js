const axios = require('axios');
const util = require('util');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const handlebars = require('handlebars');

const EmailCtrl = require('../controllers/LogsCtrl');

module.exports = class Email {
  constructor(to = '', name = '', cc = []) {
    this.to = to;
    this.name = name;
    this.cc = cc;
    this.currentYear = new Date().getFullYear();
  }

  async send(subject, htmlContent, details) {
    if (!this.to) {
      console.error('Error: No recipient email specified.');
      return;
    }
    const url = process.env.EMAIL_API_URL;
    const formdata = new FormData();

    formdata.append('TO_EMAIL', this.to);
    formdata.append('TO_NAME', this.name);
    formdata.append('BCC_LIST', this.cc);
    formdata.append('SUBJECT', subject);
    formdata.append('MESSAGE', htmlContent);

    let logDetails = { subject, to: this.to, cc: this.cc, ...details };

    try {
      const response = await axios.post(url, formdata);
      //  { status: 1, message: 'Email Send Successfully', result: [] }
      logDetails = { ...logDetails, status: 'success', info: response.data };
    } catch (error) {
      logDetails = { ...logDetails, status: 'fail', err: error.message };
    }
    EmailCtrl.insertEmailLog(logDetails);
  }

  async serviceRequestSubmited(serviceDetails) {
    try {
      const readFile = util.promisify(fs.readFile);
      const emailTemplatePath = path.join(
        __dirname,
        '../Views/Emails/requestHandleTeam.html'
      );

      const emailTemplate = await readFile(emailTemplatePath, 'utf8');
      const compiledTemplate = handlebars.compile(emailTemplate);

      const service = {
        ...serviceDetails,
        created_at: moment(serviceDetails.create_at).format(
          'DD-MM-YYYY HH:mm:ss'
        ),
      };

      const emailContent = compiledTemplate({
        service,
        currentYear: this.currentYear,
      });
      await this.send('service request submit', emailContent, serviceDetails);
    } catch (error) {
      console.error('Error sending order tracking email:', error);
    }
  }
};
