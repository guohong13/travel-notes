Component({
  properties: {
    travelNote: {
      type: Object,
      value: {}
    },
    showStatus: {
      type: Boolean,
      value: true
    },
    showActions: {
      type: Boolean,
      value: true
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
      console.log(this.data.travelNote)
      this.triggerEvent('edit', {
        travelNote: this.data.travelNote
      });
    },

    onTapCard() {
      this.triggerEvent('tapcard', {
        travelNote: this.data.travelNote
      });
    }
  }
});