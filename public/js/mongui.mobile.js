$(function(){
	$('#queryNav').click(function(){
		$('#mobile-query-form-container').show();
		$('#results').hide();
	});
	$('#resultNav').click(function(){
		$('#mobile-query-form-container').hide();
		$('#results').show();
	});
});