const express = require('express');
const loginRoutes = require('./login').router;
const getCompanyRoutes = require('./getCompany');
const getPrintersRoutes = require('./getPrinters');
const createPrintersRoutes = require('./createPrinters');
const deletePrintersRoutes = require('./deletePrinters');
const getUsername = require('./getUsername');   
const modbusPrinterStatus = require('./modbusPrinterStatus');
const modbusWriteRegister = require('./modbusWriteRegister');
const modbusReadInputRegister = require('./modbusReadInputRegister');
const refreshRoute = require('./refreshRoute');
const updateEmails = require('./updateEmails');
const router = express.Router();

router.use(loginRoutes);
router.use(getCompanyRoutes);
router.use(getPrintersRoutes);
router.use(createPrintersRoutes);
router.use(deletePrintersRoutes);
router.use(getUsername);
router.use(modbusPrinterStatus);
router.use(modbusWriteRegister);
router.use(modbusReadInputRegister);
router.use(refreshRoute);
router.use(updateEmails);

module.exports = router;