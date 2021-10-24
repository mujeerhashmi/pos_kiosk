# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "pos_kiosk"
app_title = "Pos Kiosk"
app_publisher = "9t9it"
app_description = "Kiosk App"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "info@9t9it.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/pos_kiosk/css/pos_kiosk.css"
# app_include_js = "/assets/pos_kiosk/js/pos_kiosk.js"

# include js, css files in header of web template
# web_include_css = "/assets/pos_kiosk/css/pos_kiosk.css"
# web_include_js = "/assets/pos_kiosk/js/pos_kiosk.js"

# include js in page
# page_js = {"page" : "public/js/file.js"}
page_js = {
    "kiosk": ["public/js/pos_page_js.js", "public/js/includes/number_to_words.js"]
}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "pos_kiosk.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "pos_kiosk.install.before_install"
# after_install = "pos_kiosk.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "pos_kiosk.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"pos_kiosk.tasks.all"
# 	],
# 	"daily": [
# 		"pos_kiosk.tasks.daily"
# 	],
# 	"hourly": [
# 		"pos_kiosk.tasks.hourly"
# 	],
# 	"weekly": [
# 		"pos_kiosk.tasks.weekly"
# 	]
# 	"monthly": [
# 		"pos_kiosk.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "pos_kiosk.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "pos_kiosk.event.get_events"
# }

