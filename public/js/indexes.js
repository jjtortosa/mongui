$(function(){
	$('#indexes .drop').click(function(){
		var name = this.dataset.name;

		if(!confirm($('#indexes').data('dropMsg').replace('%s', name)))
			return false;

		var $tr = $(this).parents('tr:first');

		$.ajax({
			url: '/ajax/dropIndex',
			method: 'post',
			data: {
				db: $('#db').val(),
				collection: $('#collection').val(),
				name: name
			}
		}).done(function(d){
			if(d.error)
				return $.alert(d.error);

			$tr.slideUp();
		});
	});
});