Component({
  properties: {
    travelNote: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onStatusTap() {
      if (this.data.travelNote.status === 'rejected') {
        this.triggerEvent('showreject', {
          reason: this.data.travelNote.reject_reason
        });
      }
    },
    
    onDelete() {
      this.triggerEvent('delete', {
        travelNote: this.data.travelNote
      });
    },

    onEdit() {
      this.triggerEvent('edit', {
        travelNote: this.data.travelNote
      });
    }
  }
});