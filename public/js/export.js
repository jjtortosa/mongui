$(function(){
	$('#coll-export').submit(function(e){
		var cols = [];
		
		$('#export .list input[type="checkbox"]:checked').each(function(){
			cols.push(this.name);
		});
		
		$('#coll-export input[name="collections"]').val(JSON.stringify(cols));
	})
});