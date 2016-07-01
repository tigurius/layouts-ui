'use strict';

var Core = require('core_boot');
var Components = require('./components/main');
var BlockTypes = require('./collections/block_types');
var ViewBlockTypes = require('./views/block_types');
var Layout = require('./models/layout');
var ViewBlocksLoad = require('./views/blocks/load');
var ModelHelper = require('./models/blocks/helper');
var HeaderView = require('./views/header');

var LayoutTypes = require('./collections/layout_types');
var NewLayoutView = require('./views/new_layout');

// browser
var Browser = require('./browser-ui/views/browser');
var TreeConfig = require('./browser-ui/models/tree_config');
var Items = require('./browser-ui/collections/items');

var Config = require('./models/config');


var Nprogress = require('nprogress');
var _ = require('underscore');

Core.Backbone.defaults = function(){
  var request = {};

  request.headers = {
    'X-CSRF-Token': Core.g.config.get('csrf_token')
  };

  return request;
};

$.extend(Core, {

  blocks: ViewBlocksLoad,

  model_helper: ModelHelper,

  app_cache_handler: function(){
      window.applicationCache && window.applicationCache.addEventListener('updateready', function() {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
          if (confirm('A new version of this site is available. Load it?')) {
            window.location.reload();
          }
        } else {
          // Manifest didn't changed. Nothing new to server.
        }
      }, false);
  },


  init: function(){
    this.app_cache_handler();
    this.setup_events();

    this.on('render plugins:reinitialize', this.reinitialize_plugins);

    Core.g.layout_types = new LayoutTypes();
    Core.g.block_types = new BlockTypes();
    Core.g.config = new Config();
  },

  hide_selects_with_one_option: function(view){
    view.$('select').each(function(){
      var alone = $('option', this).length <= 1;
      alone && $(this).parent().addClass('alone');
    });
    return this;
  },

  reinitialize_plugins: function(data){
    data.view.$('.xeditable').xeditable();
    data.view.$('.js-dependable-selects-group .js-master').dependable_select();
    data.view.$('.js-input-browse').input_browse();
    data.view.$('.js-external-video').video_thumb_fetcher();
    this.hide_selects_with_one_option(data.view);

  },

  setup_events: function(){
    this.on('sortable:start', function(){
      $(document.body).addClass('sorting');
    }).on('sortable:end', function(){
      $(document.body).removeClass('sorting');
    });

    $(document).on('dragenter', function(e){
      e.preventDefault();
      $(document.body).addClass('dragging');
    }).on('dragover dragleave', function(e){
      e.preventDefault();
    }).on('drop', function(e){
      e.preventDefault();
      $(document.body).removeClass('dragging');
    }).on('click', '.main-content', function(e){
      var $block = $(e.target).closest('[data-block]');
      if($block.length){return;}
      Core.trigger('editing:unmark');
    });

    $(document)
      .ajaxStart(function(){
        Nprogress.start();
      })

      .ajaxStop(function(){
       _.delay(Nprogress.done, 100);
      })

      .ajaxError(function(e, xhr, ajaxSettings, error ){

        if(xhr.status === 403){

          new Core.Modal({
            title:  'Session timeout',
            body: 'Press OK to refresh the page',
            cancel_disabled: true,
            modal_options: {
              keyboard: false,
              backdrop: 'static'
            }
          }).on('apply', function(){
            window.history.go(0);
          }).open();

        }

      })

  },

  page_layout: function(){
    $("#app").removeClass('preview');
    Core.g.layout = new Layout({id: parseInt(Core.router.params.id, 10)});
    $.when(
      Core.g.config.fetch(),
      Core.g.block_types.fetch_once(),
      Core.g.layout.blocks.fetch(),
      Core.g.layout.fetch()
    ).then(this.start.bind(this));
  },


  page_layout_preview: function(){
    $("#app").addClass('preview');

    Core.g.layout = new Layout({id: parseInt(Core.router.params.id, 10)});
    $.when(
      Core.g.config.fetch(),
      Core.g.block_types.fetch_once(),
      Core.g.layout.blocks.fetch(),
      Core.g.layout.fetch()
    ).then(function() {
      this.start();
    }.bind(this));
  },


  page_layout_new: function(){
    var layout = new Layout();

    var layout_view = new NewLayoutView({
      url: '/bm/app/layouts/form/create',
      model: layout
    });

    $.when(
      Core.g.layout_types.fetch()
    ).then(
      layout_view.render().open()
    );

  },

  start: function(){
    $('.zones').html(Core.g.layout.get('html'));

    Components.Zones.collection.reset(Core.g.layout.get('zones'));

    var view_block_types = new ViewBlockTypes({
      el: '.blocks',
      collection: Core.g.block_type_groups
    });

    view_block_types.render();

    this.blocks.load_layout_blocks();

    new HeaderView({model: Core.g.layout, el: '.app-header'});

    $('.right-sidebar').html(JST.sidebar());


    //this.open_browser();
  },

  open_browser: function(){

    var default_location = Core.g.tree_config.default_location();

    var tree_collection = new Items();

    var browser = new Browser({
      tree_collection: tree_collection,
      title: 'Content browser'
    }).on('apply', function(){
      alert(browser.selected_values());
    }).open();

    default_location && tree_collection.fetch_root_model_id(default_location.id);
  },

  get_positions: function(){
    var positions = [], blocks;
    $('[data-zone]').each(function(){
      var zone_id = $(this).data().zone;
      var zone_model = $(this).data('_view').model;
      blocks = [];
      $(this).find('> [data-view]').each(function(){
        var model = $(this).data('_view').model;
        !model.isNew() && blocks.push({
          block_id: model.id
        });
      });

      !zone_model.is_inherited() && positions.push({
        zone: zone_id,
        blocks: blocks
      });

    });

    return positions;
  }

});

window.Core = Core;
module.exports = Core;
