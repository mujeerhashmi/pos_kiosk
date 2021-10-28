# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe


@frappe.whitelist()
def make_customer(customer_name, customer_phone):
    if frappe.db.get_list("Contact", filters={'phone': customer_phone}):
        # Customer already exists
        return None
    else:
        customer_doc = frappe.new_doc('Customer')
        customer_doc.customer_name = customer_name
        customer_doc.flags.ignore_mandatory = True
        customer_doc.save(ignore_permissions=True)
        frappe.db.commit()

        contact = frappe.get_doc({
            'doctype': 'Contact',
            'first_name': customer_name,
            'phone': customer_phone,
            'is_primary_contact': 1
        })
        contact.append('links', {
            'link_doctype': 'Customer',
            'link_name': customer_doc.name
        })
        contact.insert(ignore_permissions=True)
        frappe.db.commit()
        return customer_doc.name
