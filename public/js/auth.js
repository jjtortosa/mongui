$(function(){
	$('#users .icon-trash').click(function(){
		var user = this.dataset.user;
		
		if(!confirm('Remove User "' + user + '"'))
			return false;
		
		var $row = $(this).parents('tr:first');
		
		$.ajax({
			data: {
				op: 'removeUser',
				user: user
			},
			type: 'post'
		}).done(function(d){
			if(d.error)
				return $.alert(d.error);
			
			if(d === true)
				$row.slideUp();
		});
	});
});