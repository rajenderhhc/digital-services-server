const axios = require('axios');
const logCtrl = require('../controllers/LogsCtrl');

module.exports = class SMS {
  constructor(mobileNum) {
    this.mobileNum = mobileNum;
    this.env = this.loadEnvVariables(); // Load environment variables
  }

  loadEnvVariables() {
    const requiredEnvVars = ['SMS_API_URL'];

    requiredEnvVars.forEach((variable) => {
      if (!process.env[variable]) {
        throw new Error(`Missing environment variable: ${variable}`);
      }
    });

    const { SMS_API_URL: apiUrl } = process.env;

    return { apiUrl };
  }

  async send(user, data) {
    const { apiUrl } = this.env;
    const { templateId, VAL1, VAL2, VAL3, VAL4, VAL5, VAL6 } = data;
    let logDetails = {
      requestId: VAL3,
      templateId,
      mobileNumber: this.mobileNum,
      employeeId: user.emp_code,
      templateId,
      action: 'New Service Request',
      remarks: '',
    };

    try {
      const formData = new FormData();
      formData.append('MOBILE', mobileNumber);
      formData.append('TEMPLATENAME', templateId);
      if (VAL1) formData.append('VAL1', VAL1);
      if (VAL2) formData.append('VAL2', VAL2);
      if (VAL3) formData.append('VAL3', VAL3);
      if (VAL4) formData.append('VAL4', VAL4);
      if (VAL5) formData.append('VAL5', VAL5);
      if (VAL6) formData.append('VAL6', VAL6);

      const result = await axios.post(apiUrl, formData);
      const { data } = result;
      const { ErrorCode, ErrorMessage, MessageData } = data;
      logDetails = {
        ...logDetails,
        smsId: MessageData.MessageId || '',
        statusCode: ErrorCode,
        message: ErrorMessage,
      };
    } catch (error) {
      logDetails = { ...logDetails, message: error.message };
    }

    logCtrl.insertSMSLogs(logDetails);
  }

  async sendEmployee(user, request) {
    const data = {
      templateId: 'DSA-Req-Rec',
      VAL1: request.emp_name,
      VAL2: request.service_name,
      VAL3: request.request_id,
      VAL4: 'http://apps.hhclservices.com/digitalservices',
    };
    await this.send(user, data);
  }
};
