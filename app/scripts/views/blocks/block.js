'use strict';

var Core = require('netgen-core');
var $ = Core.$;
var SideBarView = require('../sidebar');
var _ = require('underscore');
var DndView = require('../dnd');
var Blocks = require('../../collections/blocks');

module.exports = Core.View.extend(DndView).extend({

  initialize: function(){
    Core.View.prototype.initialize.apply(this, arguments);

    this.listenTo(Core,       'editing:unmark', this.editing_unmark);

    this.listenTo(this.model, 'change', this.setup_dom_element);
    this.listenTo(this.model, 'change:html', this.render);
    this.listenTo(this.model, 'create:success', this.$edit);
    this.listenTo(this.model, 'change_type:success', this.refresh_sidebar);
    this.listenTo(this.model, 'copy:success', this.on_copy);
    this.listenTo(this.model, 'delete:success', this.on_destroy);
    this.listenTo(this.model, 'edit', this.$edit);
    this.listenTo(this.model, 'change_type:success sidebar_save:success', this.reload_model);
    this.listenTo(this.model, 'restore:success', this.after_restore);
    if(!this.model.isNew()){
      this.setup_dom_element();
      this.render();
    }
  },

  reload_model: function(){
    this.model.fetch();
    return this;
  },

  events: {
    'click': '$edit',
    'click > .block-header .js-destroy': '$destroy',
    'click > .block-header .js-copy': '$copy_block',
    'click > .block-header .js-revert': '$restore_block',
    'click > .block-header .js-modal-mode': 'modal_mode'
  },


  setup_dom_element: function(){
    // this.model.is_in_container() && this.$el.attr('data-in-container', '');
    this.$el
      .attr('data-block', '')
      .attr('data-type', this.model.get('identifier'));

    this.is_container() && this.$el.attr('data-container', '');
    return this;
  },

  /**
   * NOTE: when overriding the render DO NOT forget to trigger events
   *       if not calling super method
   * @param  {html}
   * @return {this}
   */
  render: function(x){
    _.isString(x) && console.error(x);
    this.$el.html(this.model.get('html'));
    if (!this.model.get('has_published_state')){
      this.$el.find('.js-revert').hide();
    }
    Core.View.prototype.render.apply(this, arguments);
    this.prepare_modal_mode();
    this.render_container();
    return this;
  },

  render_container: function () {
    this.setup_dnd_for_containers_and_zones();
    this.load_inner_blocks();
  },

  $container_el: function(){
    return this.$el.parents('[data-container]');
  },

  is_in_container: function(){
    return this.$container_el().length;
  },

  container: function(){
    return this.is_in_container() && this.$container_el().data('_view');
  },

  is_container: function(){
    return this.model.is_container();
  },

  refresh_sidebar: function(){
    this.edit_view && this.edit_view.load();
    return this;
  },

  load_sidebar: function(){
    this.edit_view = new SideBarView({
      model: this.model
    });
    $('.right-sidebar').html(this.edit_view.$el);
    this.edit_view.load();
  },

  /*
    Custom prevent propagation because we want to allow most of the events and
    only stop those to the parent
  */
  $edit: function(e){
    // Prevent propagation
    if(e && e.timeStamp === Core.last_edited_block_timestamp){ return; }
    Core.last_edited_block_timestamp = e.timeStamp;

    // Return if already editing
    if(this.editing){ return; }

    Core.trigger('editing:unmark', {block: this});

    this.editing_mark();
    this.load_sidebar();
    return this;
  },

  $destroy: function(e){
    e && e.stopPropagation();
    var self = this;
    return new Core.Modal({
      title: 'Delete block',
      body: 'Are you sure you want to delete the block? This cannot be undone.',
      apply_text: 'Delete',
    }).on('apply', function(){
      self.model.destroy();
    }).open();
  },

  on_destroy: function(){
    var is_in_container = this.is_in_container(),
        container = this.container();

    this.remove();
    is_in_container && container.trigger('block:remove');
    Core.trigger('positions:update');
  },

  $fast_destroy: function(){
    this.remove();
    this.model.destroy();
    Core.trigger('positions:update');
  },

  editing_mark: function(){
    this.editing = true;
    this.$el.addClass('editing');
  },


  editing_unmark: function(data){
    if(data && this === data.block){return;}
    this.editing = false;
    this.$el.removeClass('editing');
  },

  $restore_block: function(e){
    e.stopPropagation();
    var self = this;
    return new Core.Modal({
      title: 'Revert block',
      body: 'Are you sure you want to revert the block to its published version? This cannot be undone.',
      apply_text: 'Revert'
    }).on('apply', function(){
      self.model.restore();
    }).open();
  },

  after_restore: function(){
    this.reload_model();
    this.refresh_sidebar();
  },

  $copy_block: function(){
    console.log('copy_block copy_block copy_block copy_block copy_block', this);
    if(this.is_in_container()){
      this.model.copy_in_container();
    } else {
      this.model.copy();
    }
  },

  on_copy: function(new_block_attributes){
    var new_block = Core.model_helper.init_block_from_type(this.model, new_block_attributes);
    var view_block = Core.blocks.create_view(new_block.attributes.definition_identifier, new_block);
    // this.$el.closest('[data-receiver]').append(view_block.$el);
    this.$el.after(view_block.$el);
    view_block.$edit();
  },

  prepare_modal_mode: function(){
    this.supports_modal_mode !== true && this.$('.js-modal-mode, .js-modal-mode + .divider' ).hide();
  },

  modal_mode: function(){
    this.$placeholder = $('<div>', {height: this.$el.height()});
    this.$el.after(this.$placeholder);
    new Core.Modal({
      className: 'modal block',
      apply_text: 'Exit',
      cancel_disabled: true,
      $dom_el: this.$el
    }).open()
    .on('open', _.delay(function() {
      this.enter_modal_mode();
    }.bind(this), 50))
    .on('before_close', function() {
      this.$placeholder.replaceWith(this.$el);
      this.exit_modal_mode();
    }.bind(this))
    return this;
  },

  enter_modal_mode: function(){},
  exit_modal_mode: function(){},



  load_inner_blocks: function(){
    var view_block, views = [];
    console.log('load inner blocks', this.model.get('placeholders'));
    var zone_id = this.model.zone().id;
    var layout_id = this.model.zone().get('layout_id');
    var block_id = this.model.id;
    _.each(this.model.get('placeholders'), function(placeholder){
      var blocks = new Blocks(placeholder.blocks);
      var views = blocks.map(function(block){
        block.set({
          block_id: block_id,
          placeholder: placeholder.identifier,
          zone_identifier: zone_id,
          layout_id: layout_id
        });
        return Core.blocks.create_view(block.get('definition_identifier'), block).$el;
      }, this);

      this.$('[data-placeholder="'+placeholder.identifier+'"]').append(views);

    }, this)

    return this;

  },

});
