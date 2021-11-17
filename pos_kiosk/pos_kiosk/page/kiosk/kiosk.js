frappe.provide('erpnext.pos');

frappe.pages["kiosk"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Welcome to Balsam Pharmacy",
		single_column: true,
	});

	//Hide the Navbar
	$("header").hide();
	wrapper.kiosk = new erpnext.pos.PointOfSale(wrapper);  
	window.cur_pos = wrapper.kiosk;
};

erpnext.pos.PointOfSale = class PointOfSale {
	constructor(wrapper) {
		this.wrapper = $(wrapper).find(".layout-main-section");	
		this.page = wrapper.page;
		const assets = [
		'assets/pos_kiosk/css/kiosk.css'
		];

		frappe.require(assets, () => {
		this.make();
		});
	}

	make() {
		return frappe.run_serially([
		() => frappe.dom.freeze(),
		() => {
			this.prepare_dom();
			this.set_online_status();
			this.setup_events();
		},
		() => {
			frappe.dom.unfreeze();
		}
		]);
	}  

	prepare_dom() {
		this.wrapper.append(`
		<div class="container">
			<div class="logo-container">
				<h1>Welcome to Balsam Pharmacy</h1>
				<img class="logo" src="/assets/pos_kiosk/images/logo.png">
			</div>

			<div class="content">
				<div class="launch-screen">
					<div class="row">
						<button type="button" class="col-lg-4 btn btn-success register">Register</button>
					</div>
					<img class="cart-logo" src="/assets/pos_kiosk/images/pharma_cart.png">
					<input type="text" class="form-control text-field customer-phone" placeholder="Enter Phone Number" autofocus />
					<button type="button" class="btn btn-danger continue">START</button>
					<button type="button" class="btn btn-warning without-registration">START AS GUEST</button>				
				</div>

				<div class="registration-screen">
					<h3 class="small-heading">Please Enter</h3>
					<h1 class="big-heading">Your Details</h1>
					<div class="register-form">
						<input type="text" class="form-control text-field register-customer-phone" placeholder="Enter Phone Number" autofocus/>								
						<input type="text" class="form-control text-field register-customer-name" placeholder="Enter Full Name" />					
					</div>
					<button type="button" class="btn btn-danger submit-customer">SUBMIT</button>
					<button type="button" class="btn btn-success register-btn-back">HOME</button>
				</div>

				<div class="cart-screen">				
					<div class="row">						
						<button type="button" class="btn btn-danger cancel-cart">CANCEL</button>
					</div>					
					<div class="row customer-detail">
						<div class="col-lg-6">
							<span class="customer-caption">Customer</span>
						</div>
						<div class="col-lg-6">
							<span class="customer-field"/>
						</div>
					</div>
					<div class="row">
						<div class="item-search">
						</div>
					</div>
					<div class="row">
						<div class="cart-container">
						</div>                
					</div>
				</div>

				<div class="payment-screen">
					<h3 class="small-heading">Please Select Your</h3>
					<h1 class="big-heading">Payment Method</h1>
					<form class="mop-container">
					</form>					
					<div class="row qrcode-container">
						<h1 class="big-heading text-center">
							Scan QR Code
						</h1>
						<img class="qrcode" src="/assets/pos_kiosk/images/qr.jpeg">
						<h1 class="big-heading text-center">
							BH18FIBH11301059440020
						</h1>
					</div>
					<div class="row">
						<button type="button" class="btn btn-success submit-payment">PAY</button>
					</div>
					<div class="row">
						<button type="button" class="btn btn-danger cancel-payment">CANCEL</button>
					</div>
				</div>
			</div>

		</div>
			`);

		this.wrapper.find(".launch-screen").css("display", "block");
		this.wrapper.find(".registration-screen").css("display", "none");
		this.wrapper.find(".cart-screen").css("display", "none");
		this.wrapper.find(".payment-screen").css("display", "none");

		this.$customer_phone = this.wrapper.find(".customer-phone");
		this.$register_customer_name = this.wrapper.find(".register-customer-name");
		this.$register_customer_phone = this.wrapper.find(".register-customer-phone");
	}

	set_online_status() {
		this.connection_status = false;
		this.page.set_indicator(__("Offline"), "grey");
		frappe.call({
		method: "frappe.handler.ping",
		callback: (r) => {
			if (r.message) {
			this.connection_status = true;
			this.page.set_indicator(__("Online"), "green");
			}
		},
		});
	}

	setup_events() {
		var me = this;
		this.wrapper.on("click", ".continue", function () {
			me.check_customer(me);
		});      

		this.wrapper.on("click", ".without-registration", function () {
			me.wrapper.find(".launch-screen").css("display", "none");
			me.make_new_invoice("Guest", me);
		});

		this.wrapper.on("click", ".register", function () {
			me.$register_customer_name[0].value = "";
			me.$register_customer_phone[0].value = "";
			me.$register_customer_name.css("border", "none");
			me.$register_customer_phone.css("border", "none");
			me.wrapper.find(".launch-screen").css("display", "none");			
			me.wrapper.find(".registration-screen").css("display", "block");
		});

		me.wrapper.on("click", ".submit-customer", function() {      
			me.register_customer(me);
		});

		me.wrapper.on("click", ".register-btn-back", function() {
			me.wrapper.find(".registration-screen").css("display", "none");
			me.go_to_launch();
		});

		me.wrapper.on("click", ".cancel-cart", function() {
			me.wrapper.find(".cart-screen").css("display", "none");
			me.go_to_launch();
		});

		me.wrapper.on("click", ".submit-payment", function() {
			var selectedOption = $("input[name=payment_method]:checked").val();
			console.log("submit-payment",selectedOption, me.frm.doc.grand_total);
			$.each(me.frm.doc.payments, function(i, data) {
				if (__(data.mode_of_payment) == __(selectedOption)) {
					frappe.model.set_value('Sales Invoice Payment', data.name, 'amount', me.frm.doc.grand_total);
				} else {
					frappe.model.set_value('Sales Invoice Payment', data.name, 'amount', 0);
				}
			});
			me.submit_sales_invoice();
		});

		me.wrapper.on("click", ".cancel-payment", function() {   
			me.wrapper.find(".payment-screen").css("display", "none");
			me.wrapper.find(".cart-screen").css("display", "block");
			me.items.search_field.$input.focus();			
		});

		me.wrapper.on("click", ".form-check-input", function() {
			console.log($(this),$(this).val());
			if ($(this).val() == "Benefit Pay") {
				me.wrapper.find(".qrcode-container").css("display", "block");
			} else {
				me.wrapper.find(".qrcode-container").css("display", "none");
			}			
			$(".form-check-input[value=\"" + $(this).val() + "\"]").prop('checked','true');
		});
	}

	check_customer(me) {
		if (me.$customer_phone[0].value == "") {
			me.$customer_phone.css("border", "solid red");
			frappe.throw(__("Please Enter Your Phone Number"));
			// frappe.show_alert({
			// 	indicator: "red",
			// 	message: __("Please Enter Your Phone Number"),
			// });
		} else {
			// Get the contact with the customer with this mobile number
			frappe.db.get_doc("Contact", null, { Phone: me.$customer_phone[0].value })
			.then((doc) => {
				if (doc) {
				doc.links.forEach((x, i) => {
					if (x.link_doctype == "Customer") {
						me.wrapper.find(".launch-screen").css("display", "none");
						me.make_new_invoice(x.link_name, me);
					}
				});
				}           
			})
			.catch(err => {
				frappe.throw(__("You Are Not Registered. Please Register"));
				// frappe.show_alert({
				// 	indicator: "orange",
				// 	message: __(
				// 		"You Are Not Registered. Please Register"
				// 	),
				// });
			});
		}
	}

	register_customer(me) {  
		if (me.$register_customer_name[0].value == "") {
			me.$register_customer_name.css("border", "solid red");
			frappe.throw(__("Please Enter Your Name"));
			// frappe.show_alert({
			// 	indicator: "red",
			// 	message: __("Please Enter Your Name"),
			// });
		} else if (me.$register_customer_phone[0].value == "") {
			me.$register_customer_phone.css("border", "solid red");
			frappe.throw(__("Please Enter Your Phone Number"));
			// frappe.show_alert({
			// 	indicator: "red",
			// 	message: __("Please Enter Your Phone Number"),
			// });        
		} else {
			frappe.call({
				method: "pos_kiosk.pos_kiosk.page.kiosk.kiosk.make_customer",
				args: {
					customer_name: me.$register_customer_name[0].value,
					customer_phone: me.$register_customer_phone[0].value
				},
				callback: function(r) {
					if (!r.message) {
						frappe.throw(__("This Phone Number already exists"));
						// frappe.show_alert({
						// 	indicator: "red",
						// 	message: __("This Phone Number already exists"),
						// });
					} else {
						// frappe.show_alert({
						// 	indicator: "green",
						// 	message: __("You are Successfully Registered"),
						// });
						me.wrapper.find(".registration-screen").css("display", "none");
						me.go_to_launch();						
					}
				}
			});
		}            
	}

  	make_new_invoice(customer, me) {
		this.wrapper.find(".logo-container").css("display", "none");
    	this.wrapper.find(".cart-screen").css("display", "block");
    	return frappe.run_serially([
			() => this.make_sales_invoice_frm(),
			() => this.set_pos_profile_data(),
			() => {
				//Customer Field
				frappe.call({
					method: "frappe.client.get",
					args: {
						doctype: "Customer",
						name: customer
					}, callback: function (data) {
						me.frm.set_value('customer', customer);
						me.wrapper.find('.customer-field').append(data.message.customer_name);
					}
				});
			},
			() => {
				if (this.cart) {
					this.cart.frm = this.frm;
					this.cart.reset();
					this.items.search_field.$input.focus();
				} else {					
					this.make_items();
					this.make_cart();
				}
			},
		]);
  	}
	
	// reset_cart() {
	// 	this.cart.frm = this.frm;		
	// 	this.cart.reset();
	// 	this.items.reset_search_field();
	// }
    
  	make_sales_invoice_frm() {
		const doctype = 'Sales Invoice';
		return new Promise(resolve => {
			if (this.frm) {
				this.frm = get_frm(this.frm);
				if(this.company) {
					this.frm.doc.company = this.company;
				}

				resolve();
			} else {
				frappe.model.with_doctype(doctype, () => {
					this.frm = get_frm();
					resolve();
				});
			}
		});

		function get_frm(_frm) {
			const page = $('<div>');
			const frm = _frm || new _f.Frm(doctype, page, false);
			const name = frappe.model.make_new_doc_and_get_name(doctype, true);
			frm.refresh(name);
			frm.doc.items = [];
			frm.doc.is_pos = 1;

			return frm;
		}
	}

  	set_pos_profile_data() {
		if (this.company) {
			this.frm.doc.company = this.company;
		}

		if (!this.frm.doc.company) {
			return;
		}

		// We need fetch this for setting print format in an offline POS system
		frappe.xcall("erpnext.stock.get_item_details.get_pos_profile",
			{
				'company': this.frm.doc.company,
				'pos_profile': 'Pos Kiosk'
			})
			.then((r) => {
				console.log("get_pos_profile",r);
				if(r) {
					this.frm.doc.pos_profile = r.name;
					this.frm.meta.default_print_format = r.print_format || "";					
				} else {
					this.raise_exception_for_pos_profile();
				}
		});

		return new Promise(resolve => {
			return this.frm.call({
				doc: this.frm.doc,
				method: "set_missing_values",
			}).then((r) => {
				if(!r.exc) {
					if (!this.frm.doc.pos_profile) {
						frappe.dom.unfreeze();
						this.raise_exception_for_pos_profile();
					}
					this.frm.script_manager.trigger("update_stock");
					frappe.model.set_default_values(this.frm.doc);
					this.frm.cscript.calculate_taxes_and_totals();
					
					if (r.message) {
						this.frm.allow_edit_rate = r.message.allow_edit_rate;
						this.frm.allow_edit_discount = r.message.allow_edit_discount;
						this.frm.doc.campaign = r.message.campaign;
					}
				}

				resolve();
			});
		});
	}

	raise_exception_for_pos_profile() {
		frappe.throw(__("POS Profile is required to use Point-of-Sale"));
	}

	make_items() {		
		this.items = new POSItems({
			wrapper: this.wrapper.find('.item-search'),
			frm: this.frm,
			events: {
				update_cart: (item, field, value) => {
					if(!this.frm.doc.customer) {
						frappe.throw(__('Please select a customer'));
					}
					this.update_item_in_cart(item, field, value);
					this.cart && this.cart.unselect_all();
				}
			}
		});
	}	

	make_cart() {
		this.cart = new POSCart({
			frm: this.frm,
			wrapper: this.wrapper.find('.cart-container'),
			events: {				
				on_field_change: (item_code, batch_no, field, value) => {
					this.update_item_qty_in_cart(item_code, batch_no, field, value);
				},
				on_numpad: (value) => {
					if (value == __('Pay')) {
						this.go_to_payment();
					}
				},
				get_item_details: (item_code) => {
					return this.items.get(item_code);
				}
			}
		});

		frappe.ui.form.on('Sales Invoice', 'selling_price_list', (frm) => {
			if(this.items && frm.doc.pos_profile) {
				this.items.reset_items();
			}
		})    
	}

	update_item_qty_in_cart(item_code, batch_no, field='qty', value=1) {
		let item = {};
		if (batch_no) {
			item = this.frm.doc.items.find(i => i['batch_no'] === batch_no);			
			console.log("update_item_qty_in_cart",batch_no,item);
		} else {
			item = this.frm.doc.items.find(i => i['item_code'] === item_code);
			console.log("update_item_qty_in_cart",item);
		}
		if (item) {
			if (typeof value === 'string') {
				// value can be of type '+1' or '-1'
				value = item['qty'] + flt(value);
			}
			this.update_item_in_frm(item, field, value)
				.then(() => {
					// update cart
					this.update_cart_data(item);
				});
		}
	}

	update_item_in_cart(item_code, field='qty', value=1, batch_no) {
		frappe.dom.freeze();
		if(this.cart.exists(item_code, field == 'batch_no'? batch_no=value: '')) {
			const search_field = batch_no ? 'batch_no' : 'item_code';
			const search_value = batch_no || item_code;
			console.log(search_field, search_value);
			const item = this.frm.doc.items.find(i => i[search_field] === search_value);			
			frappe.flags.hide_serial_batch_dialog = false;

			console.log("Existing Item");
			console.log(item);
			if (!item) {
				frappe.throw(__("The Cart and Form Items Differ"));
			}
			
			if (typeof value === 'string' && !in_list(['serial_no', 'batch_no'], field)) {
				// value can be of type '+1' or '-1'
				value = item[field] + flt(value);
			}

			if(field === 'serial_no') {
				value = item.serial_no + '\n'+ value;
			}
			
			if(field === 'batch_no') {
				item.qty += 1;
				item.amount = flt(item.rate) * flt(item.qty);
			}

			// if actual_batch_qty and actual_qty if there is only one batch. In such
			// a case, no point showing the dialog
			const show_dialog = item.has_serial_no || item.has_batch_no;
			
			if (show_dialog && field == 'qty' && ((!item.batch_no && item.has_batch_no) ||
				(item.has_serial_no) || (item.actual_batch_qty != item.actual_qty)) ) {
				this.select_batch_and_serial_no(item, 0);
			} else {
				this.update_item_in_frm(item, field, value)
					.then(() => {
						// update cart
						this.update_cart_data(item);
					});
			}
			return;
		}
		
		let args = { item_code: item_code };
		if (in_list(['serial_no', 'batch_no'], field)) {
			args[field] = value;
		}

		// add to cur_frm
		let item = this.frm.add_child('items', args);
		frappe.flags.hide_serial_batch_dialog = true;
		
		// await this.update_item_details(this.frm.doc, item.doctype, item.name, field === 'batch_no'? value: None);
		
		console.log("New Item", item);
		// if (field === 'batch_no') {
		// 	let tries = 0;
		// 	const wait_for_item_code_event = setInterval(() => {
		// 		const { doctype: cdt, name: cdn } = item;
		// 		const { batch_no } = frappe.get_doc(cdt, cdn);
		// 		if (batch_no !== value || tries > 600) {
		// 			frappe.model.set_value(cdt, cdn, 'batch_no', value);															
		// 			console.log("New Item Reloaded",item);
		// 		} else {
		// 			this.update_cart_data(item);
		// 			console.log("Tries",tries);
		// 			clearInterval(wait_for_item_code_event);
		// 		}
		// 		tries++;
		// 	}, 300);
		// }
		
		frappe.run_serially([
			() => this.frm.script_manager.trigger('item_code', item.doctype, item.name),			
			() => {
				const show_dialog = item.has_serial_no || item.has_batch_no;

				// if actual_batch_qty and actual_qty if then there is only one batch. In such
				// a case, no point showing the dialog
				if (show_dialog && field == 'qty' && ((!item.batch_no && item.has_batch_no) ||
					(item.has_serial_no) || (item.actual_batch_qty != item.actual_qty)) ) {
					// check has serial no/batch no and update cart
					this.select_batch_and_serial_no(item, 1);
				} else {
					// update cart
					this.update_cart_data(item);
				}
			}
		]);
	}

	select_batch_and_serial_no(row, new_item) {
		frappe.dom.unfreeze();
		
		const me = this;
		frappe.prompt([{
			'fieldtype': 'Link',
			'read_only': 0,
			'fieldname': 'batch_no',
			'options': 'Batch',
			'label': __('Select Batch'),
			'reqd': 1,
			get_query: function () {
				return {
					filters: {
						item_code: row.item_code,
						warehouse: row.warehouse
					},
					query: 'erpnext.controllers.queries.get_batch_no'
				};
			}
		}],
		function(values){
			if (me.cart.exists(row.item_code, values.batch_no)) {				
				console.log("select_batch_and_serial_no: Old Batch");
				console.log(values.batch_no, row);
				row.batch_no = values.batch_no;
				row.qty += 1;
				me.update_item_in_frm(row, 'qty', row.qty)
					.then(() => {
						// update cart
						me.update_cart_data(row);
					});
			} else {
				console.log("select_batch_and_serial_no: New Batch");
				if (!new_item) {
					let args = { item_code: row.item_code, batch_no: values.batch_no};
					row = me.frm.add_child('items', args);
					me.frm.script_manager.trigger('item_code', row.doctype, row.name);
				} else {
					row.batch_no = values.batch_no;
				}
				console.log(values.batch_no,row);
				me.update_cart_data(row);
			}
						
		}, __('Select Batch No'))

		// erpnext.show_serial_batch_selector(this.frm, row, () => {
		// 	this.frm.doc.items.forEach(item => {
		// 		this.update_item_in_frm(item, 'qty', item.qty)
		// 			.then(() => {
		// 				// update cart
		// 				frappe.run_serially([
		// 					() => {
		// 						if (item.qty === 0) {
		// 							frappe.model.clear_doc(item.doctype, item.name);
		// 						}
		// 					},
		// 					() => this.update_cart_data(item)
		// 				]);
		// 			});
		// 	})
		// }, () => {
		// 	this.on_close(row);
		// }, true);
	}

	on_close(item) {
		if (!this.cart.exists(item.item_code, item.batch_no) && item.qty) {
			frappe.model.clear_doc(item.doctype, item.name);
		}
	}

	update_cart_data(item) {
		this.cart.add_item(item);
		this.cart.update_taxes_and_totals();
		this.cart.update_grand_total();
		this.cart.update_qty_total();
		frappe.dom.unfreeze();
	}

	update_item_in_frm(item, field, value) {
		if (field == 'qty' && value < 0) {
			frappe.msgprint(__("Quantity must be positive"));
			value = item.qty;
		} else {
			if (in_list(["qty", "serial_no", "batch_no"], field)) {
				item[field] = value;
				if (field == "serial_no" && value) {
					let serial_nos = value.split("\n");
					item["qty"] = serial_nos.filter(d => {
						return d!=="";
					}).length;
				}				
			} else {
				return frappe.model.set_value(item.doctype, item.name, field, value);
			}
		}

		return this.frm.script_manager.trigger('qty', item.doctype, item.name)
			.then(() => {
				if (field === 'qty' && item.qty === 0) {
					frappe.model.clear_doc(item.doctype, item.name);
				}
			})
	}

	submit_sales_invoice() {
		this.savesubmit()
			.then((r) => {
				if (r && r.doc) {
					this.frm.doc.docstatus = r.doc.docstatus;
										
					let d = new frappe.ui.Dialog({
						title: 'Thank You'
					});
					d.$body.append(`
						<div class="row">
							Transaction Complete<br>
							<img style="margin: auto; display: block; max-width: 250px; max-height: 250px;"
								class="transaction-complete" src="/assets/pos_kiosk/images/check.png">
						</div>
					`)
					d.show();
					cur_frm.print_preview.printit(true);
					setTimeout(() => {
						d.hide();
						this.wrapper.find(".payment-screen").css("display", "none");
						this.go_to_launch();
					}, 5000);
					
				}
			});
	}

	go_to_launch() {
		this.$customer_phone[0].value = "";
		this.$customer_phone.css("border", "none");
		this.wrapper.find('.customer-field').empty();
		this.wrapper.find(".logo-container").css("display", "block");
		this.wrapper.find(".launch-screen").css("display", "block");		
	}

	go_to_payment() {
		this.wrapper.find(".cart-screen").css("display", "none");
		this.wrapper.find(".mop-container").empty();
		this.wrapper.find(".qrcode-container").css("display", "none");
		this.wrapper.find(".payment-screen").css("display", "block");
				
		this.frm.doc.payments.forEach((p) => {
			let id=p.mode_of_payment.replace(" ","_");
			this.wrapper.find(".mop-container").append(
				`<div class="form-check-inline">
					<label class="form-check-label">
						<input type="radio" class="form-check-input" name="payment_method" value="${p.mode_of_payment}">
						${__(p.mode_of_payment)}
					</label>
				</div>
				`
			)
		});
	}

	savesubmit = function(btn, callback, on_error) {
		var me = this.frm;
	
		let handle_fail = () => {
			$(btn).prop('disabled', false);
			if (on_error) {
				on_error();
			}
		};
	
		return new Promise(resolve => {
			me.validate_form_action("Submit");
			frappe.validated = true;
			me.script_manager.trigger("before_submit").then(function() {
				if(!frappe.validated) {
					handle_fail();
					return;
				}

				me.save('Submit', function(r) {
					if(r.exc) {
						handle_fail();
					} else {
						frappe.utils.play_sound("submit");
						callback && callback();
						me.script_manager.trigger("on_submit")
							.then(() => resolve(me));
					}
				}, btn, () => handle_fail(), resolve);
			});			
		});
	};
};

const [Qty,Disc,Rate,Del,Pay] = [__("Qty"), __('Disc'), __('Rate'), __('Del'), __('Pay')];

class POSCart {
	constructor({frm, wrapper, events}) {
		this.frm = frm;
		this.item_data = {};
		this.wrapper = wrapper;
		this.events = events;
		this.make();
		this.bind_events();
	}

	make() {
		this.make_dom();
	}

	make_dom() {
		this.wrapper.append(`
			<div class="pos-cart">				
				<div class="cart-wrapper">
					<div class="list-item-table">
						<div class="list-item list-item--head">
							<div class="list-item__content list-item__content--flex-2">${__('Item Name')}</div>
							<div class="list-item__content text-right">${__('Quantity')}</div>
							<div class="list-item__content rate text-right">${__('Rate')}</div>
							<div class="list-item__content amount text-right">${__('Amount')}</div>
						</div>
						<div class="cart-items">
							<div class="empty-state">
								<span>${__('No Items added to cart')}</span>
							</div>
						</div>
						<div class="taxes-and-totals">
							${this.get_taxes_and_totals()}
						</div>
						<div class="discount-amount">`+
						(!this.frm.allow_edit_discount ? `` : `${this.get_discount_amount()}`)+
						`</div>
						<div class="grand-total">
							${this.get_grand_total()}
						</div>
						<div class="quantity-total">
							${this.get_item_qty_total()}
						</div>
					</div>
				</div>
				<div class="row form-group">
					<button type="button" class="btn btn-success submit-cart">PRESS TO PAY</button>					
				</div>
			</div>
		`);


		this.$cart_items = this.wrapper.find('.cart-items');
		this.$empty_state = this.wrapper.find('.cart-items .empty-state');
		this.$taxes_and_totals = this.wrapper.find('.taxes-and-totals');
		this.$discount_amount = this.wrapper.find('.discount-amount');
		this.$grand_total = this.wrapper.find('.grand-total');
		this.$qty_total = this.wrapper.find('.quantity-total');

		// this.toggle_taxes_and_totals(false);
		// this.$grand_total.on('click', () => {
		// 	this.toggle_taxes_and_totals();
		// });
	}

	reset() {
		this.$cart_items.find('.list-item').remove();
		this.$empty_state.show();
		this.$taxes_and_totals.html(this.get_taxes_and_totals());
		this.numpad && this.numpad.reset_value();		
		this.frm.msgbox = "";

		let total_item_qty = 0.0;
		this.frm.set_value("pos_total_qty",total_item_qty);

		this.$discount_amount.find('input:text').val('');
		this.wrapper.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency));
		this.wrapper.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency));
		this.$qty_total.find(".quantity-total").text(total_item_qty);

		if (this.numpad) {
			const disable_btns = this.disable_numpad_control()
			const enable_btns = [__('Rate'), __('Disc')]

			if (disable_btns) {
				enable_btns.filter(btn => !disable_btns.includes(btn))
			}

			this.numpad.enable_buttons(enable_btns);
		}
	}

	get_grand_total() {
		let total = this.get_total_template('Grand Total', 'grand-total-value');

		if (!cint(frappe.sys_defaults.disable_rounded_total)) {
			total += this.get_total_template('Rounded Total', 'rounded-total-value');
		}

		return total;
	}

	get_item_qty_total() {
		let total = this.get_total_template('Total Qty', 'quantity-total');
		return total;
	}

	get_total_template(label, class_name) {
		return `
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 footer-row">${__(label)}</div>
				<div class="list-item__content footer-numbers ${class_name}">0.00</div>
			</div>
		`;
	}

	get_discount_amount() {
		const get_currency_symbol = window.get_currency_symbol;

		return `
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Discount')}</div>
				<div class="list-item__content discount-inputs">
					<input type="text"
						class="form-control additional_discount_percentage text-right"
						placeholder="% 0.00"
					>
					<input type="text"
						class="form-control discount_amount text-right"
						placeholder="${get_currency_symbol(this.frm.doc.currency)} 0.00"
					>
				</div>
			</div>
		`;
	}

	get_taxes_and_totals() {
		return `
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 footer-row">${__('Net Total')}</div>
				<div class="list-item__content net-total footer-numbers">0.00</div>
			</div>
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 footer-row">${__('Taxes')}</div>
				<div class="list-item__content taxes footer-numbers">0.00</div>
			</div>
		`;
	}

	toggle_taxes_and_totals(flag) {
		if (flag !== undefined) {
			this.tax_area_is_shown = flag;
		} else {
			this.tax_area_is_shown = !this.tax_area_is_shown;
		}

		this.$taxes_and_totals.toggle(this.tax_area_is_shown);
		this.$discount_amount.toggle(this.tax_area_is_shown);
	}

	update_taxes_and_totals() {
		if (!this.frm.doc.taxes) { return; }

		const currency = this.frm.doc.currency;
		this.frm.refresh_field('taxes');

		// Update totals
		this.$taxes_and_totals.find('.net-total')
			.html(format_currency(this.frm.doc.total, currency));

		// Update taxes
		const taxes_html = this.frm.doc.taxes.map(tax => {
			return `
				<div>
					<span>${tax.description}</span>
					<span class="text-right bold">
						${format_currency(tax.tax_amount, currency)}
					</span>
				</div>
			`;
		}).join("");
		this.$taxes_and_totals.find('.taxes').html(taxes_html);
	}

	update_grand_total() {
		this.$grand_total.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency)
		);

		this.$grand_total.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency)
		);
	}

	update_qty_total() {
		var total_item_qty = 0;
		$.each(this.frm.doc["items"] || [], function (i, d) {
				if (d.qty > 0) {
					total_item_qty += d.qty;
				}
		});
		this.$qty_total.find('.quantity-total').text(total_item_qty);
		this.frm.set_value("pos_total_qty",total_item_qty);
	}	

	disable_numpad_control() {
		let disabled_btns = [];
		if(!this.frm.allow_edit_rate) {
			disabled_btns.push(__('Rate'));
		}
		if(!this.frm.allow_edit_discount) {
			disabled_btns.push(__('Disc'));
		}
		return disabled_btns;
	}
		
	set_input_active(btn_value) {
		this.selected_item.removeClass('qty disc rate');

		this.numpad.set_active(btn_value);
		if (btn_value === Qty) {
			this.selected_item.addClass('qty');
			this.selected_item.active_field = 'qty';
		} else if (btn_value == Disc) {
			this.selected_item.addClass('disc');
			this.selected_item.active_field = 'discount_percentage';
		} else if (btn_value == Rate) {
			this.selected_item.addClass('rate');
			this.selected_item.active_field = 'rate';
		}
	}

	add_item(item) {
		this.$empty_state.hide();

		if (this.exists(item.item_code, item.batch_no)) {
			console.log("add_item: update quantity",item.item_code, item.batch_no);
			// update quantity			
			this.update_item(item);
		} else if (flt(item.qty) > 0.0) {
			// add to cart
			console.log("add_item: add to cart",item.item_code, item.batch_no);
			const $item = $(this.get_item_html(item));
			$item.appendTo(this.$cart_items);
		} else {
			console.log("add_item: Not updated", flt(item.qty));
		}
		this.highlight_item(item.item_code);
		this.scroll_to_item(item.item_code);
	}

	update_item(item) {
		const item_selector = item.batch_no ?
			`[data-batch-no="${item.batch_no}"]` : `[data-item-code="${escape(item.item_code)}"]`;

		const $item = this.$cart_items.find(item_selector);

		if(item.qty > 0) {
			const is_stock_item = this.get_item_details(item.item_code).is_stock_item;
			const indicator_class = (!is_stock_item || item.actual_qty >= item.qty) ? 'green' : 'red';
			const remove_class = indicator_class == 'green' ? 'red' : 'green';

			$item.find('.quantity input').val(item.qty);
			$item.find('.rate').text(format_currency(item.rate, this.frm.doc.currency));
			$item.find('.amount').text(format_currency(item.amount, this.frm.doc.currency));
			$item.addClass(indicator_class);
			$item.removeClass(remove_class);
		} else {
			$item.remove();
		}
	}

	get_item_html(item) {
		const is_stock_item = this.get_item_details(item.item_code).is_stock_item;
		const rate = format_currency(item.rate, this.frm.doc.currency);
		const amount = format_currency(item.amount, this.frm.doc.currency);
		const indicator_class = (!is_stock_item || item.actual_qty >= item.qty) ? 'green' : 'red';
		const batch_no = item.batch_no || '';

		return `
			<div class="list-item indicator ${indicator_class}" data-item-code="${escape(item.item_code)}"
				data-batch-no="${batch_no}" title="Item: ${item.item_name}  Available Qty: ${item.actual_qty}">
				<div class="item-name list-item__content list-item__content--flex-2 ellipsis">
					${item.item_name}
				</div>
				<div class="quantity list-item__content text-left">
					${get_quantity_html(item.qty)}
				</div>
				<div class="rate list-item__content text-right">
					${rate}
				</div>
				<div class="amount list-item__content text-right">
					${amount}
				</div>
			</div>
		`;

		function get_quantity_html(value) {
			return `
				<div class="input-group input-group-xs">
					<span class="input-group-btn">
						<button class="btn btn-success btn-xs" data-action="increment">+</button>
					</span>

					<input class="form-control" type="number" value="${value}">

					<span class="input-group-btn">
						<button class="btn btn-danger btn-xs" data-action="decrement">-</button>
					</span>
				</div>
			`;
		}
	}

	get_item_details(item_code) {
		if (!this.item_data[item_code]) {
			this.item_data[item_code] = this.events.get_item_details(item_code);
		}

		return this.item_data[item_code];
	}

	exists(item_code, batch_no) {
		const is_exists = batch_no ?
			`[data-batch-no="${batch_no}"]` : `[data-item-code="${escape(item_code)}"]`;

		let $item = this.$cart_items.find(is_exists);

		return $item.length > 0;
	}

	highlight_item(item_code) {
		const $item = this.$cart_items.find(`[data-item-code="${escape(item_code)}"]`);
		$item.addClass('highlight');
		setTimeout(() => $item.removeClass('highlight'), 1000);
	}

	scroll_to_item(item_code) {
		const $item = this.$cart_items.find(`[data-item-code="${escape(item_code)}"]`);
		if ($item.length === 0) return;
		const scrollTop = $item.offset().top - this.$cart_items.offset().top + this.$cart_items.scrollTop();
		this.$cart_items.animate({ scrollTop });
	}

	bind_events() {
		const me = this;
		const events = this.events;

		// quantity change
		this.$cart_items.on('click',
			'[data-action="increment"], [data-action="decrement"]', function() {
				const $btn = $(this);
				const $item = $btn.closest('.list-item[data-item-code]');
				const item_code = unescape($item.attr('data-item-code'));
				const batch_no = unescape($item.attr('data-batch-no'));
				const action = $btn.attr('data-action');

				if(action === 'increment') {
					events.on_field_change(item_code, batch_no, 'qty', '+1');
				} else if(action === 'decrement') {
					events.on_field_change(item_code, batch_no, 'qty', '-1');
				}
			});

		this.$cart_items.on('change', '.quantity input', function() {
			const $input = $(this);
			const $item = $input.closest('.list-item[data-item-code]');
			const item_code = unescape($item.attr('data-item-code'));
			const batch_no = unescape($item.attr('data-batch-no'));
			events.on_field_change(item_code, batch_no, 'qty', flt($input.val()));
		});

		// current item
		this.$cart_items.on('click', '.list-item', function() {
			me.set_selected_item($(this));
		});

		this.wrapper.find('.additional_discount_percentage').on('change', (e) => {
			const discount_percentage = flt(e.target.value,
				precision("additional_discount_percentage"));

			frappe.model.set_value(this.frm.doctype, this.frm.docname,
				'additional_discount_percentage', discount_percentage)
				.then(() => {
					let discount_wrapper = this.wrapper.find('.discount_amount');
					discount_wrapper.val(flt(this.frm.doc.discount_amount,
						precision('discount_amount')));
					discount_wrapper.trigger('change');
				});
		});

		this.wrapper.find('.discount_amount').on('change', (e) => {
			const discount_amount = flt(e.target.value, precision('discount_amount'));
			frappe.model.set_value(this.frm.doctype, this.frm.docname,
				'discount_amount', discount_amount);
			this.frm.trigger('discount_amount')
				.then(() => {
					this.update_discount_fields();
					this.update_taxes_and_totals();
					this.update_grand_total();
				});
		});

		this.wrapper.find('.submit-cart').on('click', () => {	
			if (this.frm.doc.items.length == 0) {
				frappe.throw(__("Please add items to the cart first."))
			}		
			this.events.on_numpad(__('Pay'));
		});
	}

	update_discount_fields() {
		let discount_wrapper = this.wrapper.find('.additional_discount_percentage');
		let discount_amt_wrapper = this.wrapper.find('.discount_amount');
		discount_wrapper.val(flt(this.frm.doc.additional_discount_percentage,
			precision('additional_discount_percentage')));
		discount_amt_wrapper.val(flt(this.frm.doc.discount_amount,
			precision('discount_amount')));
	}

	set_selected_item($item) {
		this.selected_item = $item;
		this.$cart_items.find('.list-item').removeClass('current-item qty disc rate');
		this.selected_item.addClass('current-item');
	}

	unselect_all() {
		this.$cart_items.find('.list-item').removeClass('current-item qty disc rate');
		this.selected_item = null;
	}
}

class POSItems {
	constructor({wrapper, frm, events}) {
		this.wrapper = wrapper;
		this.frm = frm;
		this.items = {};
		this.events = events;
		this.currency = this.frm.doc.currency;

		frappe.db.get_value("Item Group", {lft: 1, is_group: 1}, "name", (r) => {
			this.parent_item_group = r.name;
			this.make_dom();
			this.make_fields();

			// this.init_clusterize();
			// this.bind_events();
			this.load_items_data();
		})
	}

	load_items_data() {
		// bootstrap with 20 items
		this.get_items()
			.then(({ items }) => {
				this.all_items = items;
				this.items = items;
			});
	}

	reset_items() {
		// this.wrapper.find('.pos-items').empty();
		// this.init_clusterize();
		this.load_items_data();
	}

	make_dom() {
		this.wrapper.html(`
			<div class="search-field">
			</div>			
		`);		
	}

	make_fields() {
		// Search field
		const me = this;		
		this.search_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Data',				
				placeholder: __('Scan Item')
			},
			parent: this.wrapper.find('.search-field'),
			render_input: true,
		});		

		this.search_field.set_focus();

		frappe.ui.keys.on('ctrl+i', () => {
			this.search_field.set_focus();
		});

		this.search_field.$input.on('input', (e) => {
			clearTimeout(this.last_search);
			this.last_search = setTimeout(() => {
				const search_term = e.target.value;
				this.filter_items({ search_term });
			}, 300);
		});		
	}

	// init_clusterize() {
	// 	this.clusterize = new Clusterize({
	// 		scrollElem: this.wrapper.find('.pos-items-wrapper')[0],
	// 		contentElem: this.wrapper.find('.pos-items')[0],
	// 	});
	// }

	// render_items(items) {
	// 	let _items = items || this.items;

	// 	const all_items = Object.values(_items).map(item => this.get_item_html(item));
	// 	let row_items = [];        

	// 	for (let i=0; i < all_items.length; i++) {		  
	// 		let curr_row = '<div class="image-view-row">';
	// 		curr_row += all_items[i];
	// 		curr_row += '</div>';
	// 		row_items.push(curr_row);
	// 	}

	// 	this.clusterize.update(row_items);
	// }

	filter_items({ search_term='', item_group=this.parent_item_group }={}) {
		if (search_term) {
			search_term = search_term.toLowerCase();

			// memoize
			this.search_index = this.search_index || {};
			if (this.search_index[search_term]) {
				const items = this.search_index[search_term];
				this.items = items;
        		// this.render_items(items);				
				this.set_item_in_the_cart(items);
				return;
			}
		} else if (item_group == this.parent_item_group) {
			this.items = this.all_items;
			return;
		}

		this.get_items({search_value: search_term, item_group })
			.then(({ items, serial_no, batch_no, barcode }) => {
				if (search_term && !barcode && !batch_no && !serial_no) {
					this.search_index[search_term] = items;
				}

				this.items = items;
        		// this.render_items(items);				
				this.set_item_in_the_cart(items, serial_no, batch_no, barcode);
			});
	}

	set_item_in_the_cart(items, serial_no, batch_no, barcode) {
		if (serial_no) {
			this.events.update_cart(items[0].item_code,
				'serial_no', serial_no);
			this.reset_search_field();
			return;
		}

		if (batch_no) {
			console.log("set_item_in_the_cart");
			console.log(batch_no);
			this.events.update_cart(items[0].item_code,
				'batch_no', batch_no);
			this.reset_search_field();
			return;
		}

		if (items.length === 1 && (serial_no || batch_no || barcode || items[0].item_code)) {
			this.events.update_cart(items[0].item_code,
				'qty', '+1');
			this.reset_search_field();
		}
	}

	reset_search_field() {
		this.search_field.set_value('');
		this.search_field.$input.trigger("input");
	}

	// bind_events() {
	// 	var me = this;
	// 	this.wrapper.on('click', '.pos-item-wrapper', function() {
	// 		const $item = $(this);
	// 		const item_code = unescape($item.attr('data-item-code'));
	// 		me.events.update_cart(item_code, 'qty', '+1');
	// 	});
	// }

	get(item_code) {
		let item = {};
		this.items.map(data => {
			if (data.item_code === item_code) {
				item = data;
			}
		})

		return item
	}

	get_all() {
		return this.items;
	}

	// get_item_html(item) {
	// 	const price_list_rate = format_currency(item.price_list_rate, this.currency);
	// 	const { item_code, item_name, item_image} = item;
	// 	const item_title = item_name || item_code;

	// 	const template = `
	// 		<div class="pos-item-wrapper image-view-item" data-item-code="${escape(item_code)}">
	// 			<div class="image-view-header">
	// 				<div>
	// 					<a class="grey list-id" data-name="${item_code}" title="${item_title}">
	// 						${item_title}
	// 					</a>
	// 				</div>
	// 			</div>
	// 			<div class="image-view-body">
	// 				<a	data-item-code="${item_code}"
	// 					title="${item_title}"
	// 				>
	// 					<div class="image-field"
	// 						style="${!item_image ? 'background-color: #fafbfc;' : ''} border: 0px;"
	// 					>
	// 						${!item_image ? `<span class="placeholder-text">
	// 								${frappe.get_abbr(item_title)}
	// 							</span>` : '' }
	// 						${item_image ? `<img src="${item_image}" alt="${item_title}">` : '' }
	// 					</div>
	// 					<span class="price-info">
	// 						${price_list_rate}
	// 					</span>
	// 				</a>
	// 			</div>
	// 		</div>
	// 	`;

	// 	return template;
	// }

	get_items({start = 0, page_length = 40, search_value='', item_group=this.parent_item_group}={}) {
		const price_list = this.frm.doc.selling_price_list;
		return new Promise(res => {
			frappe.call({
				method: "erpnext.selling.page.point_of_sale.point_of_sale.get_items",
				freeze: true,
				args: {
					start,
					page_length,
					price_list,
					item_group,
					search_value,
					pos_profile: this.frm.doc.pos_profile
				}
			}).then(r => {
				// const { items, serial_no, batch_no } = r.message;

				// this.serial_no = serial_no || "";
				res(r.message);
			});
		});
	}
}