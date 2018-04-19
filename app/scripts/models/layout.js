'use strict';

var Core = require('netgen-core');
var $ = Core.$;
var Blocks = require('../collections/blocks');
var Zones = require('../collections/zones');
var _ = require('underscore');

module.exports = Core.Model.extend({

  path: 'layouts',
  paths: {
    blocks: ':locale/layouts/:id/blocks',
    change_layout: '/layouts/:id/change_type'
  },

  initialize: function(){
    Core.Model.prototype.initialize.apply(this, arguments);
    this.blocks = new Blocks();

    this.on('change:id', this.reset_blocks_loaded);
    this.on('discard:success', this.reset_loaded)

    this.blocks.url = function(){
      return this.url('blocks');
    }.bind(this);

    return this;
  },


  main_language: function() {
    return this.get('available_locales') && this.get('available_locales')[this.get('main_locale')] + ' (Main)';
  },


  locale: function() {
    return this.get('view_locale') || this.get('main_locale');
  },


  has_locale: function(locale) {
    return this.get('available_locales') && !!this.get('available_locales')[locale];
  },

  parse: function(resp){
    if(resp){
      _.each(resp.zones, function(zone) {
        zone.layout_id = resp.id
      })
      this.zones = new Zones(resp.zones);
      this.zones.layout = this;
    }

    return Core.Model.prototype.parse.apply(this, arguments);
  },

  reset_loaded: function(){
    this.loaded = null;
  },

  reset_blocks_loaded: function(){
    this.blocks.reset(null);
    this.blocks.loaded = false;
    return this;
  },


  toJSON: function(options){
    options || (options = {});
    var json = Core.Model.prototype.toJSON.apply(this, arguments);
    if(!options.parse){return json;}
    json.positions = JSON.stringify(json.positions);
    return json;
  },

  inherited_zones: function(){
    return Core._.where(Core.g.layout.get('zones'), {kind: 2});
  },

  get_block_by_id: function(id){
    return Core.g.layout.get('blocks').get(id);
  },

  publish: function(opts){
    return this.save(null, $.extend({
      via: 'publish',
      method: 'POST',
      patch: true
    }, opts));
  },

  publish_and_continue: function(){
    return this.publish({
      via: 'publish_and_continue',
      url: this.url('publish')
    }).done(this.create_new_draft.bind(this))
  },

  discard: function(){
    return this.save(null, {
      via: 'discard',
      method: 'DELETE',
      url:this.url('draft'),
      patch: true
    });
  },


  create_new_draft: function(){
    return this.save(null, {
      via: 'draft',
      method: 'POST',
      patch: true
    });
  },


  // JSON version
  change_layout: function(data){
     this.save(null, {
      via: 'change_layout',
      url: this.url('change_layout'),
      method: 'POST',
      patch: true,
      attrs: data
    });
  },


  // application/x-www-form-urlencoded; charset=UTF-8
  _change_layout: function(data){
    this.sync('create', this, {
      via: 'change_layout',
      url: this.url('change_layout'),
      method: 'POST',
      processData: true,
      data: data
    });
  },

  unmapped_zone_ids_for: function(new_layout_type){
    var new_zones = new_layout_type.zones.pluck('id')
    var current_zones = this.zones.pluck('id');
    return _.difference(current_zones, new_zones);
  },

  load_all_blocks: function(opts){
    opts || (opts = {});


    // For linked blocks
    var zone_blocks_loaded = _.map(this.zones.linked(), function(zone){
      return zone.load_blocks({data: {published: true}});
    })

    zone_blocks_loaded.unshift(this.blocks.fetch({
      data: opts.data,
      remove: false
    }));


    return $.when.apply($, zone_blocks_loaded).then(function(){
      this.blocks.trigger('blocks_loaded:success');
    }.bind(this));

  },

});
