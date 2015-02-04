var l = console.log;

$(function(){
	var db = $('#db').val(),
		collection = $('#collection').val();
	
	$('.exp').click(function(){
		var title = $(this).html() === 'Expandir' ? 'Colapsar' : 'Expandir';
		
		$(this).html(title).parents('.result-box').find('.result').toggleClass('expanded');
		return false;
	});
	
	$(document).click(function(){
		$('#field_menu').hide();
	});
		
	$('#results').on('click', '[data-action="delete-row"]', function(e){
		e.preventDefault();
		
		var id = $(this).parents('.result-box:first')[0].id;
		
		if(!confirm('Are you sure to delete the item with id "' + id + '"?'))
			return;
		
		$.ajax({
			data: {
				op: 'deleteRow',
				id: id,
				db: db,
				collection: collection
			},
			type: 'post'
		}).done(function(d){
			if(d.error)
				return alert(d.error);
			
			if(d.affected === 1){
				$('#' + id).slideUp();
				
				//actualizamos número de registros en la colección
				var $numspan = $('#collections>.active>span');
				
				$numspan.text($numspan.text().replace(/\d+/, function(n){ return --n; }));
			}
		});
	}).on('click', '[data-action="new-field"]', function(e){
		e.preventDefault();
		
		fieldMethods.fieldCreate({
			id: $(this).parents('.result-box:first')[0].id
		});
	}).on('click', '.r-key', function(){
		$('.r-key.selected').removeClass('selected');
		
		var $a = $(this).addClass('selected'),
			pos = $a.position();
		
		if($a.text() !== '_id'){
			pos.left += $a.width() + 4;

			$('#field_menu').css(pos).show().data({target: $a});
		}
		
		return false;
	}).on('click', '.moretext', function(e){
		e.preventDefault();
		
		var $a = $('#field_menu a[href="#fieldUpdate"]');
		
		$a.parent().data('target', $(this).parent().prev());
		
		$a.click();
	});
	
	$('#field_menu a').click(function(){
		var $a = $(this),
			$target = $a.parent().data('target'),
			func = $a.attr('href').substr(1),
			parent = $target.attr('data-parent');
		
		$a.parent().hide();
	
		fieldMethods[func]({
			field: (parent ? parent + '.' : '') + $target.text(),
			id: $target.parents('.result-box:first').attr('id'),
			target: $target
		});
		
		return false;
	});
	
	var $updateDialog = $('#update-dialog').dialog({
		autoOpen: false,
		width: 540,
		modal: true,
		buttons: {
			Apply: function() {
				fieldMethods.doUpdate(function(){
					$updateDialog.dialog( "close" );
				});
			},
			Cancel: function() {
				$updateDialog.dialog( "close" );
			}
		}
	});
	
	var fieldMethods = {
		fieldCreate: function(o){
			var data = {
				key: o.field,
				id: o.id,
				db: db,
				collection: collection
			};
			
			$('#dialog-field-name').show();
			
			$('#data_key').val('');
			
			var $dt = $('#data_type');
			
			if(!$dt.val())
				$dt.val('');
			
			$dt.change();
			
			$('#update-dialog')
				.dialog('open')
				.dialog('option', 'title', 'Add new field')
				.data({field: data, target: null});
		},
		getField: function(id, k, cb){
			$.ajax({
				url: location.pathname + '/' + id + '/' + k
			}).done(cb);
		},
		fieldUpdate: function(o){
			$('#data_key').val(o.field);
			
			fieldMethods.getField(o.id, o.field, function(d){
				$('#data_type').val(d.inputType).change();
				$('#data_value').attr('data-name', o.field).attr('data-id', o.id);
				
				switch(d.inputType){
					case 'mixed':
					case 'string':
					case 'binary':
						$('#data_value textarea').val(d.val);
						break;
					case 'boolean':
						$('#data_value select').val([d.val]);
						break;
					case 'null':
						break;
					default:
						$('#data_value input').val(d.val);
				}
			
				$('#dialog-field-name').hide();
				
				$('#update-dialog')
					.dialog('open')
					.dialog('option', 'title', 'Modify field "' + o.field + '"')
					.data(o);
			});
		},
		fieldSortAsc: function(o){
			console.error('Todo: fieldSortAsc');
		},
		fieldSortDesc: function(o){
			console.error('Todo: fieldSortDesc');
		},
		fieldRename: function(o){
			console.error('Todo: fieldRename');
		},
		fieldRemove: function(o){
			if(!confirm('Are you sure to remove field "' + o.field + '"?'))
				return;
			
			$.ajax({
				url: '/db/' + db + '/' + collection,
				data: {
					op: 'deleteField',
					key: o.field,
					id: o.id,
					db: db,
					collection: collection
				},
				type: 'post'
			}).done(function(d){
				if(d.error)
					return alert(d.error);

				if(d.affected === 1){
					$(o.target[0].nextSibling).remove();//text node ': '
					
					o.target.next().remove();//span content value
					
					if(o.target[0].previousSibling.nodeValue[0]===',')
						$(o.target[0].previousSibling).remove();
					
					o.target.remove();
				}
			});
		},
		fieldClear: function(o){
			console.error('Todo: fieldClear');
		},
		fieldHide: function(o){
			console.error('Todo: fieldHide');
		},
		fieldShow: function(o){
			console.error('Todo: fieldShow');
		},
		doUpdate: function(cb){
			var ddata = $updateDialog.data()
			,	$target = ddata.target
			,	data = {
					op: 'setField',
					db: db,
					collection: collection,
					id: ddata.id || ddata.field.id,
					field: $.trim($('#data_key').val()),
					value: $('#data_value').find('>*').val(),
					type: $('#data_type').val()
				};
			
			if(!data.field)
				return alert('No name');
			
			$.ajax({
				url: '/db/' + db + '/' + collection,
				data: data,
				type: 'POST'
			}).done(function(d){
				if(d.error)
					return alert(d.error);
				
				if(!$target){//es un nuevo campo
					var $last = $('#' + data.id + '>.result>span:last');
					
					$last.append(',\n\t');
					
					$target = $('<a class="r-key" href="#" data-type="' + data.type + '">' + data.key + '</a>')
						.insertAfter($last);
				
					$target.after(': <span>');
				}
				
				$target.next().html(data.value);
				
				cb();
			});
		}
	};
	
	$('#data_type').change(function(){
		var val = $(this).val(),
			$dv = $('#data_value').empty().parent().toggle(val !== 'null').end();

		switch($(this).val()){
			case 'mixed':
			case 'string':
			case 'binary':
				$dv.append('<textarea rows="10" cols="48">');
				break;
			case 'boolean':
				$dv.append('<select><option value="true">True</option><option value="false">False</option></select>');
				break;
			case 'null':
				break;
			default:
				$dv.append('<input>');
		}
	});
	
	$('form#command').submit(function(e){
		e.preventDefault();
		
		$.ajax({
			url: '/post',
			type: 'post',
			data: $(this).serializeArray()
		}).done(function(d){
			$('#command-result').show().find('pre').text(JSON.stringify(d, null, '\t'));
		});
		
		return false;
	});
	
	$('[href="truncate"]').click(function(){
		if(confirm($(this).attr('data-msg').replace('%s', collection))){
			op.value='truncate';
			$('#post').submit();
		}
		return false;
	});
	
	$('[href="drop"]').click(function(){
		if(confirm($(this).attr('data-msg').replace('%s', collection))){
			op.value='drop';
			$('#post').submit();
		}
		return false;
	});
	
	if($('.result-box').size() === 1)
		$('.exp').click();
	
	$('#explain').click(function(){
		$.ajax({
			url: location.pathname,
			data: {
				action: 'explain',
				criteria: $('#criteria').val()
			}
		}).done(function(d){
			if(d.error)
				return alert(d.error);
			
			$('.paginator').remove();
			
			var $r = $('#results').empty()
			,	$t = $('<table style="width:auto" class="lcaption"><thead><tr><th colspan="2">explain()</th></tr></thead><tbody></tbody></table>')
					.appendTo($r).find('tbody');
			
			$.each(d, function(k){
				$t.append('<tr><th>' + k + '</td><td><pre>' + JSON.stringify(this, null, '\t') + '</pre></td></tr>');
			});
		});
	});
	
	$(window).resize(function(){
		$('.auto-height').height($(this).height());
	}).resize();
});