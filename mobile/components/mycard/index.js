Component({
  properties: {
    travelNote: {
      type: Object,
      value: {}
    }
  },

  methods: {
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