'use strict';

var LayoutBasePage = require('./layout_base');
var HeaderView = require('../views/header');

module.exports = LayoutBasePage.extend({
  main: function(params, xhr){
    LayoutBasePage.prototype.main.apply(this, arguments);

    var layout = Core.g.layout;

    // if(params.type === 'new'){
    //   Core.router.navigate_to('layout', {id: 1}, {trigger: false});
    // }


    if(Core.router.params.type === 'link'){
      Core.state.set({mode: 'linking', section: 'linking'});
    }else{
      Core.state.set({mode: Core.g.layout.get('shared') ? 'edit_shared' : 'edit', section: 'edit'});
    }



    new HeaderView({
      model: Core.g.layout,
      base_layout: this.base_layout
    }).render_to('.app-center');


    if(layout.get('published')){
      this.create_new_draft();
      return;
    }


    if(!layout.get('published') && layout.get('has_published_state') && !params.type){
      this.render_modal(layout);
      return;
    }


    this.load_blocks_and_go_to_edit_mode();



    return this;
  },


  render_modal: function(model){
    new Core.Modal({
        template: 'modal_discard_or_edit',
        title:  'What would you like to do with the draft?',
        model: model,
        modal_options: {
          keyboard: false,
          backdrop: 'static'
        }
      })

      //Edit
      .on('cancel', function(){
        this.load_blocks_and_go_to_edit_mode();
      }.bind(this))

      //Discard
      .on('apply', function(){
        this.create_new_draft();
      }.bind(this))
      .open();
  },

  load_blocks_and_go_to_edit_mode: function(){
    var master = Core.router.route_name === 'layout_edit_master';
    if(master){
      //Core.router.navigate_to('layout_edit_master', {id: Core.g.layout.id, type: 'edit', draft_layout_id: Core.router.params.draft_layout_id}, {trigger: false });
      Core.state.set({mode: 'edit_master', section: 'normal'});
    }else{
      //Core.router.navigate_to('layout', {id: Core.g.layout.id, type: 'edit'}, {trigger: false });
    }
    Core.g.layout.blocks.fetch();
  },


  create_new_draft: function(){
    Core.g.layout.create_new_draft().done(function() {
      this.load_blocks_and_go_to_edit_mode()
    }.bind(this));
    return this;
  },



});
