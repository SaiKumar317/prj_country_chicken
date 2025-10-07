***Note: Before running this module, Node.js must be installed on your system. If it is not already installed, please download and install it from this link {https://nodejs.org/en}.
To check if Node.js is installed correctly and to verify its version, 
open a command prompt or terminal and type the following command:
		=> node -v


If you are working with Node.js for the first time:
		=> Run the nodeInitial.bat file by double-clicking on it.

		=> Setting up the IIS Settings for port rerouting
			=>> STEP-1 -> Install url rewrite -> https://www.iis.net/downloads/microsoft/url-rewrite
			=>> STEP-2 -> Install Application Request Routing -> https://www.iis.net/downloads/microsoft/application-request-routing
			=>> STEP-3 -> open IIS and Click on the server node (root) → double-click "Application Request Routing Cache"
							On the right-hand side, click Server Proxy Settings → check Enable proxy → Apply

***********************************************************************************************************************************************************************

To configure this module as External module, follow the below Steps:
===================================================================

1> First keep the published folder in this path -> C:\inetpub\wwwroot and Convert To Application

2>Go to file path C:\inetpub\wwwroot\country_chicken\online_sales_order\.env
	and change 

	ipAddress = 'http://172.16.1.174'
	focusUsername = 'su'
	focusPassword = 'su'
	focusCompanyCode = 0A0

3> Run the _prj_start.bat {double Click on _prj_start.bat}
		     


To stop the old module go to the path: C:\inetpub\wwwroot\country_chicken\online_sales_order in powershell as admin and run the command>> npm run delete
***********************************************************************************************************************************************************************

API Details:
============

url: http://localhost/country_chicken/online_sales_order
method: POST

External Tables:
===============
select * from EX_Integration_Status_Master
select * from EX_Integration_Status_Transaction

Note: Import the below reports which is in publish folder in Home /Utilities /Report Designer to check the Integration  details
1. Master Integration Report.xml
2. Transaction Integration Report.xml