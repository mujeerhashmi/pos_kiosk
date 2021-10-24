frappe.provide('erpnext.pos');

frappe.pages["kiosk"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Balsam Pharmacy",
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
      'assets/pos_kiosk/css/kiosk.css',
      'assets/erpnext/js/pos/clusterize.js'
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
      },
      () => this.page.set_title(__("Balsam Pharmacy")),
    ]);
  }  

  prepare_dom() {
    this.wrapper.append(`
      <div class="container">
        <div class="content">

          <div class="launch-screen">
            <h1 class="big-heading">Purchase</h1>
            <form class="kiosk-form">
              <div class="form-group">
                <input type="number" class="form-control text-field customer-phone" placeholder="Enter Phone Number" autofocus />
                <button type="button" class="btn btn-danger continue">CONTINUE</button>
                <button type="button" class="btn btn-warning without-registration">CONTINUE WITHOUT REGISTRATION</button>
                <button type="button" class="btn btn-success register">REGISTER</button>
              </div>
            </form>
          </div>

          <div class="registration-screen">
            <h3 class="small-heading">Please Enter</h3>
            <h1 class="big-heading">Your Details</h1>
            <form class="kiosk-form">
              <div class="form-group">
                <input type="text" class="form-control text-field register-customer-name" placeholder="Enter Full Name" autofocus />
                <input type="text" class="form-control text-field register-customer-phone" placeholder="Enter Phone Number"/>
                <button type="button" class="btn btn-success submit-customer">SUBMIT</button>
                <button type="button" class="btn btn-danger register-btn-back">BACK</button>
              </div>
            </form>
          </div>

          <div class="cart-screen">
            <div class="row">
              <div class="col-md-4">
                  <span class="customer-caption">
                      <i class="fa fa-user"></i>
                      Customer Name
                  </span>
              </div>
              <div class="col-md-8">
                  <span class="customer-field"/>
              </div>
            </div>
            <div class="row">
              <div class="search-field"/>
            </div>
            <div class="row">              
              <div class="cart-container">
              </div>                
            </div>
          </div>

        </div>
      </div>
		`);

    this.wrapper.find(".launch-screen").css("display", "block");
    this.wrapper.find(".registration-screen").css("display", "none");
    this.wrapper.find(".cart-screen").css("display", "none");

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
      me.wrapper.find(".launch-screen").css("display", "none");
      me.wrapper.find(".registration-screen").css("display", "block");      
    });

    me.wrapper.on("click", ".submit-customer", function() {      
      me.register_customer(me);
    });

    me.wrapper.on("click", ".register-btn-back", function() {
      me.$register_customer_name[0].value = "";
      me.$register_customer_phone[0].value = "";
      me.wrapper.find(".registration-screen").css("display", "none");
      me.wrapper.find(".launch-screen").css("display", "block");
    });
  }

  check_customer(me) {
    if (me.$customer_phone[0].value == "") {
      me.$customer_phone.css("border", "solid red");
      frappe.show_alert({
        indicator: "red",
        message: __("Please Enter Your Phone Number"),
      });
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
            frappe.show_alert({
              indicator: "orange",
              message: __(
                "You Are Not Registered. Please Register"
              ),
            });
          });
      }
  }

  register_customer(me) {  
    if (me.$register_customer_name[0].value == "") {
      me.$register_customer_name.css("border", "solid red");
      frappe.show_alert({
        indicator: "red",
        message: __("Please Enter Your Name"),
      });
    } else if (me.$register_customer_phone[0].value == "") {
      me.$register_customer_phone.css("border", "solid red");
      frappe.show_alert({
        indicator: "red",
        message: __("Please Enter Your Phone Number"),
      });        
    } else {        
      frappe.call({
        method: "pos_kiosk.pos_kiosk.page.kiosk.make_customer",
        args: {
          customer_name: me.$register_customer_name[0].value,
          customer_phone: me.$register_customer_phone[0].value
        },
        callback: function(r) {
          console.log(r)
          if (!r.message) {
            frappe.show_alert({
              indicator: "red",
              message: __("This Phone Number already exists"),
            });
          } else {
            frappe.show_alert({
              indicator: "green",
              message: __("You are Successfully Registered"),
            });
            me.wrapper.find(".registration-screen").css("display", "none");
            me.make_new_invoice(r.message.customer, me);
          }
        }
      });
    }            
  }

  make_new_invoice(customer, me) {
    this.wrapper.find(".cart-screen").css("display", "block");
    return frappe.run_serially([
			() => this.make_sales_invoice_frm(),
			() => this.set_pos_profile_data(),
			() => {
				if (this.cart) {
					this.cart.frm = this.frm;
					this.cart.reset();
				} else {
					frappe.db.get_value("Item Group", {lft: 1, is_group: 1}, "name", (r) => {
            this.parent_item_group = r.name;
            this.make_fields(customer, me);
            this.load_items_data();
          });

					this.make_cart();
				}
				this.toggle_editing(true);
			},
		]);                  
  }

  make_cart() {
    this.cart = new POSCart({
			frm: this.frm,
			wrapper: this.wrapper.find('.cart-container'),
			events: {
				on_customer_change: (customer) => {
					this.frm.set_value('customer', customer);
				},
				on_field_change: (item_code, field, value, batch_no) => {
					this.update_item_in_cart(item_code, field, value, batch_no);
				},
				on_numpad: (value) => {
					if (value == __('Pay')) {
						if (!this.payment) {
							this.make_payment_modal();
						} else {
							this.frm.doc.payments.map(p => {
								this.payment.dialog.set_value(p.mode_of_payment, p.amount);
							});

							this.payment.set_title();
						}
						this.payment.open_modal();
					}
				},
				on_select_change: () => {
					this.cart.numpad.set_inactive();
					this.set_form_action();
				},
				get_item_details: (item_code) => {
					return this.items.get(item_code);
				},
				get_loyalty_details: () => {
					var me = this;
					if (this.frm.doc.customer) {
						frappe.call({
							method: "erpnext.accounts.doctype.loyalty_program.loyalty_program.get_loyalty_program_details_with_points",
							args: {
								"customer": me.frm.doc.customer,
								"expiry_date": me.frm.doc.posting_date,
								"company": me.frm.doc.company,
								"silent": true
							},
							callback: function(r) {
								if (r.message.loyalty_program && r.message.loyalty_points) {
									me.cart.events.set_loyalty_details(r.message, true);
								}
								if (!r.message.loyalty_program) {
									var loyalty_details = {
										loyalty_points: 0,
										loyalty_program: '',
										expense_account: '',
										cost_center: ''
									}
									me.cart.events.set_loyalty_details(loyalty_details, false);
								}
							}
						});
					}
				},
				set_loyalty_details: (details, view_status) => {
					if (view_status) {
						this.cart.available_loyalty_points.$wrapper.removeClass("hide");
					} else {
						this.cart.available_loyalty_points.$wrapper.addClass("hide");
					}
					this.cart.available_loyalty_points.set_value(details.loyalty_points);
					this.cart.available_loyalty_points.refresh_input();
					this.frm.set_value("loyalty_program", details.loyalty_program);
					this.frm.set_value("loyalty_redemption_account", details.expense_account);
					this.frm.set_value("loyalty_redemption_cost_center", details.cost_center);
				}
			}
		});

		frappe.ui.form.on('Sales Invoice', 'selling_price_list', (frm) => {
			if(this.items && frm.doc.pos_profile) {
				this.items.reset_items();
			}
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
						this.frm.meta.default_print_format = r.message.print_format || "";
						this.frm.allow_edit_rate = r.message.allow_edit_rate;
						this.frm.allow_edit_discount = r.message.allow_edit_discount;
						this.frm.doc.campaign = r.message.campaign;
					}
				}

				resolve();
			});
		});
	}

  toggle_editing(flag) {
		let disabled;
		if (flag !== undefined) {
			disabled = !flag;
		} else {
			disabled = this.frm.doc.docstatus == 1 ? true: false;
		}
		const pointer_events = disabled ? 'none' : 'inherit';

		this.wrapper.find('input, button, select').prop("disabled", disabled);
		this.wrapper.find('.cart-container').css('pointer-events', pointer_events);

		this.page.clear_actions();
	}
  
  make_fields(customer, me) {		
    //Customer Field
    frappe.call({
      method: "frappe.client.get",
      args: {
        doctype: "Customer",
        name: customer
      },
      callback: function (data) {
        me.wrapper.find('.customer-field').append(data.message.customer_name);
      }
    });
    // Search Field
		this.search_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Data',
				label: __('Search Item (Ctrl + i)'),
				placeholder: __('Search by item code, serial number, batch no or barcode')
			},
			parent: this.wrapper.find('.search-field'),
			render_input: true,
		});

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

  filter_items({ search_term='', item_group=this.parent_item_group }={}) {
		if (search_term) {
			search_term = search_term.toLowerCase();

			// memoize
			this.search_index = this.search_index || {};
			if (this.search_index[search_term]) {
				const items = this.search_index[search_term];
				this.items = items;
				this.set_item_in_the_cart(items);
				return;
			}
		} else if (item_group == this.parent_item_group) {
			this.items = this.all_items;
			return;
		}

		this.get_items({search_value: search_term, item_group })
			.then(({ items, serial_no, batch_no, barcode }) => {
				if (search_term && !barcode) {
					this.search_index[search_term] = items;
				}

				this.items = items;				
				this.set_item_in_the_cart(items, serial_no, batch_no, barcode);
			});
	}

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
  
  set_item_in_the_cart(items, serial_no, batch_no, barcode) {
		if (serial_no) {
			this.events.update_cart(items[0].item_code,
				'serial_no', serial_no);
			this.reset_search_field();
			return;
		}

		if (batch_no) {
			this.events.update_cart(items[0].item_code,
				'batch_no', batch_no);
			this.reset_search_field();
			return;
		}

		if (items.length === 1 && (serial_no || batch_no || barcode)) {
			this.events.update_cart(items[0].item_code,
				'qty', '+1');
			this.reset_search_field();
		}
	}

	reset_search_field() {
		this.search_field.set_value('');
		this.search_field.$input.trigger("input");
	}  

};

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
		this.make_loyalty_points();
		this.make_numpad();
	}

	make_dom() {
		this.wrapper.append(`
			<div class="pos-cart">				
				<div class="cart-wrapper">
					<div class="list-item-table">
						<div class="list-item list-item--head">
							<div class="list-item__content list-item__content--flex-1.5 text-muted">${__('Item Name')}</div>
							<div class="list-item__content text-muted text-right">${__('Quantity')}</div>
							<div class="list-item__content text-muted text-right">${__('Discount')}</div>
							<div class="list-item__content text-muted text-right">${__('Rate')}</div>
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
				<div class="row">
					<div class="number-pad-container col-sm-6"></div>
					<div class="col-sm-6 loyalty-program-section">
						<div class="loyalty-program-field"> </div>
					</div>
				</div>
			</div>
		`);


		this.$cart_items = this.wrapper.find('.cart-items');
		this.$empty_state = this.wrapper.find('.cart-items .empty-state');
		this.$taxes_and_totals = this.wrapper.find('.taxes-and-totals');
		this.$discount_amount = this.wrapper.find('.discount-amount');
		this.$grand_total = this.wrapper.find('.grand-total');
		this.$qty_total = this.wrapper.find('.quantity-total');
		// this.$loyalty_button = this.wrapper.find('.loyalty-button');

		// this.$loyalty_button.on('click', () => {
		// 	this.loyalty_button.show();
		// })

		this.toggle_taxes_and_totals(false);
		this.$grand_total.on('click', () => {
			this.toggle_taxes_and_totals();
		});
	}

	reset() {
		this.$cart_items.find('.list-item').remove();
		this.$empty_state.show();
		this.$taxes_and_totals.html(this.get_taxes_and_totals());
		this.numpad && this.numpad.reset_value();
		this.customer_field.set_value("");
		this.frm.msgbox = "";

		let total_item_qty = 0.0;
		this.frm.set_value("pos_total_qty",total_item_qty);

		this.$discount_amount.find('input:text').val('');
		this.wrapper.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency));
		this.wrapper.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency));
		this.$qty_total.find(".quantity-total").text(total_item_qty);

		const customer = this.frm.doc.customer;
		this.customer_field.set_value(customer);

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
				<div class="list-item__content text-muted">${__(label)}</div>
				<div class="list-item__content list-item__content--flex-2 ${class_name}">0.00</div>
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
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Net Total')}</div>
				<div class="list-item__content net-total">0.00</div>
			</div>
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Taxes')}</div>
				<div class="list-item__content taxes">0.00</div>
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

	make_customer_field() {
    
	}

	make_loyalty_points() {
		this.available_loyalty_points = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Int',
				label: 'Available Loyalty Points',
				read_only: 1,
				fieldname: 'available_loyalty_points'
			},
			parent: this.wrapper.find('.loyalty-program-field')
		});
		this.available_loyalty_points.set_value(this.frm.doc.loyalty_points);
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


	make_numpad() {

		var pay_class = {}
		pay_class[__('Pay')]='brand-primary'
		this.numpad = new NumberPad({
			button_array: [
				[1, 2, 3, Qty],
				[4, 5, 6, Disc],
				[7, 8, 9, Rate],
				[Del, 0, '.', Pay]
			],
			add_class: pay_class,
			disable_highlight: [Qty, Disc, Rate, Pay],
			reset_btns: [Qty, Disc, Rate, Pay],
			del_btn: Del,
			disable_btns: this.disable_numpad_control(),
			wrapper: this.wrapper.find('.number-pad-container'),
			onclick: (btn_value) => {
				// on click

				if (!this.selected_item && btn_value !== Pay) {
					frappe.show_alert({
						indicator: 'red',
						message: __('Please select an item in the cart')
					});
					return;
				}
				if ([Qty, Disc, Rate].includes(btn_value)) {
					this.set_input_active(btn_value);
				} else if (btn_value !== Pay) {
					if (!this.selected_item.active_field) {
						frappe.show_alert({
							indicator: 'red',
							message: __('Please select a field to edit from numpad')
						});
						return;
					}

					if (this.selected_item.active_field == 'discount_percentage' && this.numpad.get_value() > cint(100)) {
						frappe.show_alert({
							indicator: 'red',
							message: __('Discount amount cannot be greater than 100%')
						});
						this.numpad.reset_value();
					} else {
						const item_code = unescape(this.selected_item.attr('data-item-code'));
						const batch_no = this.selected_item.attr('data-batch-no');
						const field = this.selected_item.active_field;
						const value = this.numpad.get_value();

						this.events.on_field_change(item_code, field, value, batch_no);
					}
				}

				this.events.on_numpad(btn_value);
			}
		});
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
			// update quantity
			this.update_item(item);
		} else if (flt(item.qty) > 0.0) {
			// add to cart
			const $item = $(this.get_item_html(item));
			$item.appendTo(this.$cart_items);
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
			$item.find('.discount').text(item.discount_percentage + '%');
			$item.find('.rate').text(format_currency(item.rate, this.frm.doc.currency));
			$item.addClass(indicator_class);
			$item.removeClass(remove_class);
		} else {
			$item.remove();
		}
	}

	get_item_html(item) {
		const is_stock_item = this.get_item_details(item.item_code).is_stock_item;
		const rate = format_currency(item.rate, this.frm.doc.currency);
		const indicator_class = (!is_stock_item || item.actual_qty >= item.qty) ? 'green' : 'red';
		const batch_no = item.batch_no || '';

		return `
			<div class="list-item indicator ${indicator_class}" data-item-code="${escape(item.item_code)}"
				data-batch-no="${batch_no}" title="Item: ${item.item_name}  Available Qty: ${item.actual_qty}">
				<div class="item-name list-item__content list-item__content--flex-1.5 ellipsis">
					${item.item_name}
				</div>
				<div class="quantity list-item__content text-right">
					${get_quantity_html(item.qty)}
				</div>
				<div class="discount list-item__content text-right">
					${item.discount_percentage}%
				</div>
				<div class="rate list-item__content text-right">
					${rate}
				</div>
			</div>
		`;

		function get_quantity_html(value) {
			return `
				<div class="input-group input-group-xs">
					<span class="input-group-btn">
						<button class="btn btn-default btn-xs" data-action="increment">+</button>
					</span>

					<input class="form-control" type="number" value="${value}">

					<span class="input-group-btn">
						<button class="btn btn-default btn-xs" data-action="decrement">-</button>
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
				const action = $btn.attr('data-action');

				if(action === 'increment') {
					events.on_field_change(item_code, 'qty', '+1');
				} else if(action === 'decrement') {
					events.on_field_change(item_code, 'qty', '-1');
				}
			});

		this.$cart_items.on('change', '.quantity input', function() {
			const $input = $(this);
			const $item = $input.closest('.list-item[data-item-code]');
			const item_code = unescape($item.attr('data-item-code'));
			events.on_field_change(item_code, 'qty', flt($input.val()));
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
		this.events.on_select_change();
	}

	unselect_all() {
		this.$cart_items.find('.list-item').removeClass('current-item qty disc rate');
		this.selected_item = null;
		this.events.on_select_change();
	}
}
