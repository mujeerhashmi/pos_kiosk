# -*- coding: utf-8 -*-
# Copyright (c) 2019, 9T9IT and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import json
from toolz import dissoc

@frappe.whitelist()
def get_item_details(args):
    from erpnext.stock.get_item_details import get_item_details

    result = get_item_details(args)
    frappe.logger("web").debug("{0}".format(result))
    return dissoc(result, "batch_no")