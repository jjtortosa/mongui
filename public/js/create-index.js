$(function(){
	$('.addNewField').click(function(){
		$('#fields').append('<p style="margin:0;padding:0"><input type="text" name="fields" size="30" class="ui-autocomplete-input" autocomplete="off" role="textbox" aria-autocomplete="list" aria-haspopup="true"> <select name="order"><option value="asc">ASC</option><option value="desc">DESC</option></select> <input type="button" value="-" class="removeNewField"></p>');
	});

	$('body').on('click', '.removeNewField', function(){
		$(this).parents('p:first').slideUp();
	});

	$('#clickUniqueKey').change(function(){
		$('#duplicate_tr').toggle(this.checked);
	});
});